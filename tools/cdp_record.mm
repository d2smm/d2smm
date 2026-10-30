#import "cdp_client.hpp"
#include <chrono>
#include <filesystem>
#include <fstream>
#include <iomanip>
#include <iostream>
#include <vector>

// Timed screenshots from an exact, host-verified disposable context. Never
// captures OS windows, creates a profile, imports a save, or starts a web host.
int RecordCdp(NSString *address, NSString *recipePath, NSString *outputPath) {
    namespace fs=std::filesystem;
    using Clock=std::chrono::steady_clock;
    NSData *bytes=[NSData dataWithContentsOfFile:recipePath];
    NSDictionary *recipe=bytes ? [NSJSONSerialization JSONObjectWithData:bytes options:0 error:nil] : nil;
    if (![recipe isKindOfClass:NSDictionary.class] || ![recipe[@"schema"] isEqual:@"d2smm.capture.v1"])
        throw std::runtime_error("Expected d2smm.capture.v1 recipe");
    const double duration=[recipe[@"durationMs"] doubleValue],fps=[recipe[@"fps"] doubleValue];
    if (duration<500 || duration>30000 || fps<1 || fps>30) throw std::runtime_error("Recording must be 0.5–30 seconds, 1–30 fps");
    NSString *context=recipe[@"browserContextId"],*target=recipe[@"targetId"];
    if (!context.length || !target.length) throw std::runtime_error("An explicit isolated context and target are required");
    NSArray *actions=recipe[@"actions"] ?: @[];
    double previous=-1;
    for (NSDictionary *action in actions) {
        const double at=[action[@"atMs"] doubleValue];
        if (at<previous || at<0 || at>=duration || ![action[@"command"] isKindOfClass:NSDictionary.class]) throw std::runtime_error("Invalid timed action");
        previous=at;
    }
    const fs::path output(outputPath.UTF8String);
    if (!output.is_absolute() || fs::exists(output)) throw std::runtime_error("Capture destination must be new and absolute");
    CdpClient cdp(address);
    NSDictionary *identity=cdp.checked(@{@"method":@"Target.getTargetInfo"})[@"targetInfo"];
    if (![identity[@"targetId"] isEqual:target] || ![identity[@"browserContextId"] isEqual:context]) throw std::runtime_error("Capture target/context does not match the recipe");
    NSURL *page=[NSURL URLWithString:identity[@"url"]];
    if (!([page.host isEqual:@"d2survivors.lol"] || [page.host isEqual:@"d2s.arken.gg"])) throw std::runtime_error("Capture is outside the admitted D2S origins");
    // Activating a previously background tab can restore its physical viewport.
    // Do it before fixing the compositor dimensions for the recording.
    cdp.checked(@{@"method":@"Page.bringToFront"});
    NSDictionary *original=cdp.checked(@{@"method":@"Runtime.evaluate",@"params":@{@"expression":@"({width:innerWidth,height:innerHeight})",@"returnByValue":@YES}})[@"result"][@"value"];
    fs::create_directories(output);
    std::ofstream receipt(output/"record.json");
    NSMutableArray *results=[NSMutableArray array];
    bool metrics=false,screencasting=false;
    try {
        NSDictionary *viewport=recipe[@"viewport"] ?: @{@"width":@2500,@"height":@1400,@"deviceScaleFactor":@1,@"mobile":@NO};
        cdp.checked(@{@"method":@"Emulation.setDeviceMetricsOverride",@"params":viewport}); metrics=true;
        cdp.checked(@{@"method":@"Emulation.setVisibleSize",@"params":@{@"width":viewport[@"width"],@"height":viewport[@"height"]}});
        cdp.checked(@{@"method":@"Emulation.setFocusEmulationEnabled",@"params":@{@"enabled":@YES}});
        for (NSDictionary *command in recipe[@"prepare"] ?: @[]) cdp.checked(command);
        std::vector<double> timestamps;
        NSDictionary *firstMetadata=nil;
        const auto start=Clock::now();
        cdp.onEvent=[&](NSDictionary *event){
            if (![event[@"method"] isEqual:@"Page.screencastFrame"]) return;
            NSDictionary *frame=event[@"params"];
            if([frame[@"metadata"][@"deviceWidth"] intValue]!=[viewport[@"width"] intValue]||[frame[@"metadata"][@"deviceHeight"] intValue]!=[viewport[@"height"] intValue])throw std::runtime_error("Compositor size does not match capture viewport");
            if(!firstMetadata)firstMetadata=frame[@"metadata"];
            NSData *pixels=[[NSData alloc] initWithBase64EncodedString:frame[@"data"] options:0];
            if (!pixels.length) throw std::runtime_error("Screencast returned no pixels");
            NSString *name=[NSString stringWithFormat:@"frame-%06zu.jpg",timestamps.size()];
            if (![pixels writeToFile:[outputPath stringByAppendingPathComponent:name] atomically:YES]) throw std::runtime_error("Frame write failed");
            timestamps.push_back(std::chrono::duration<double>(Clock::now()-start).count());
            cdp.send(@{@"method":@"Page.screencastFrameAck",@"params":@{@"sessionId":frame[@"sessionId"]}});
        };
        cdp.checked(@{@"method":@"Page.startScreencast",@"params":@{@"format":@"jpeg",@"quality":@90,@"maxWidth":viewport[@"width"],@"maxHeight":viewport[@"height"],@"everyNthFrame":@((int)(60/fps))}});screencasting=true;
        std::size_t actionIndex=0;
        for (;;) {
            double elapsed=std::chrono::duration<double,std::milli>(Clock::now()-start).count();
            if (elapsed>=duration) break;
            while (actionIndex<actions.count && [actions[actionIndex][@"atMs"] doubleValue]<=elapsed) {
                NSDictionary *action=actions[actionIndex++];
                NSDictionary *result=cdp.checked(action[@"command"]);
                [results addObject:@{@"atMs":@(elapsed),@"result":result}];
                elapsed=std::chrono::duration<double,std::milli>(Clock::now()-start).count();
            }
            cdp.poll(10);
        }
        cdp.checked(@{@"method":@"Page.stopScreencast"});screencasting=false;cdp.onEvent=nullptr;
        if(timestamps.empty())throw std::runtime_error("No screencast frames received");
        timestamps.front()=0;
        std::ofstream concat(output/"frames.ffconcat"); concat<<"ffconcat version 1.0\n";
        for (std::size_t i=0;i<timestamps.size();++i) {
            concat<<"file 'frame-"<<std::setw(6)<<std::setfill('0')<<i<<".jpg'\n";
            const double next=i+1<timestamps.size()?timestamps[i+1]:duration/1000.0;
            concat<<"duration "<<std::fixed<<std::setprecision(6)<<std::max(0.001,next-timestamps[i])<<"\n";
        }
        concat<<"file 'frame-"<<std::setw(6)<<std::setfill('0')<<timestamps.size()-1<<".jpg'\n";
        NSDictionary *result=@{@"schema":@"d2smm.capture-result.v1",@"target":identity,@"durationMs":@(duration),@"frames":@(timestamps.size()),@"viewport":viewport,@"sourceFrame":firstMetadata?:@{},@"actions":results,@"passed":@YES};
        NSData *json=[NSJSONSerialization dataWithJSONObject:result options:NSJSONWritingPrettyPrinted error:nil];
        receipt.write((const char*)json.bytes,json.length); receipt<<"\n";
        cdp.checked(@{@"method":@"Emulation.clearDeviceMetricsOverride"});cdp.checked(@{@"method":@"Emulation.setVisibleSize",@"params":original});metrics=false;
        cdp.checked(@{@"method":@"Emulation.setFocusEmulationEnabled",@"params":@{@"enabled":@NO}});
        std::cout<<"Recorded "<<timestamps.size()<<" frames to "<<output<<"\n";
        return 0;
    } catch (...) {
        cdp.onEvent=nullptr;
        if(screencasting)try{cdp.checked(@{@"method":@"Page.stopScreencast"});}catch(const std::exception& error){std::cerr<<"Screencast cleanup: "<<error.what()<<"\n";}
        if (metrics) try { cdp.checked(@{@"method":@"Emulation.clearDeviceMetricsOverride"});cdp.checked(@{@"method":@"Emulation.setVisibleSize",@"params":original}); } catch (const std::exception& error) { std::cerr<<"Viewport cleanup: "<<error.what()<<"\n"; }
        throw;
    }
}
