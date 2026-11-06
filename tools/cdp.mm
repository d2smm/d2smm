#import "cdp_client.hpp"
#include <iostream>
#include <stdexcept>
#include <string>

namespace {
id ResolveResult(id value,NSArray *results,unsigned depth=0){
    if(depth>64)throw std::runtime_error("CDP result reference nesting exceeded");
    if([value isKindOfClass:NSDictionary.class]){
        if(value[@"$cdpResult"]){
            id index=value[@"$cdpResult"],path=value[@"path"];
            if([value count]!=2||![index isKindOfClass:NSNumber.class]||[index doubleValue]!=[index longLongValue]||[index longLongValue]<0||[index unsignedLongLongValue]>=results.count||![path isKindOfClass:NSArray.class]||[path count]>16)throw std::runtime_error("Invalid CDP prior-result reference");
            id selected=results[[index unsignedIntegerValue]];
            for(id part in path){
                if([selected isKindOfClass:NSDictionary.class]&&[part isKindOfClass:NSString.class])selected=selected[part];
                else if([selected isKindOfClass:NSArray.class]&&[part isKindOfClass:NSNumber.class]&&[part doubleValue]==[part longLongValue]&&[part longLongValue]>=0&&[part unsignedLongLongValue]<[selected count])selected=selected[[part unsignedIntegerValue]];
                else throw std::runtime_error("CDP result reference path is invalid");
                if(!selected)throw std::runtime_error("CDP result reference member is absent");
            }
            return selected;
        }
        NSMutableDictionary *out=[NSMutableDictionary dictionary];for(NSString *key in value)out[key]=ResolveResult(value[key],results,depth+1);return out;
    }
    if([value isKindOfClass:NSArray.class]){NSMutableArray *out=[NSMutableArray array];for(id part in value)[out addObject:ResolveResult(part,results,depth+1)];return out;}
    return value;
}
int CheckReferences(){
    NSArray *results=@[@{@"result":@{@"result":@{@"objectId":@"owned-object"}}}];
    NSDictionary *reference=@{@"$cdpResult":@0,@"path":@[@"result",@"result",@"objectId"]};
    NSDictionary *resolved=ResolveResult(@{@"params":@{@"objectId":reference}},results);
    if(![resolved[@"params"][@"objectId"] isEqual:@"owned-object"])throw std::runtime_error("CDP reference resolution failed");
    for(id invalid in @[@{@"$cdpResult":@1,@"path":@[]},@{@"$cdpResult":@(-1),@"path":@[]},@{@"$cdpResult":@0,@"path":@[@"missing"]},@{@"$cdpResult":@0,@"path":@[@0]},@{@"$cdpResult":@0,@"path":@[],@"extra":@1}]){
        bool rejected=false;try{ResolveResult(invalid,results);}catch(const std::exception&){rejected=true;}
        if(!rejected)throw std::runtime_error("Invalid CDP reference was accepted");
    }
    std::cout<<"CDP result-reference checks passed\n";return 0;
}
}

int main(int argc,char **argv){
    if(argc==2&&std::string(argv[1])=="--version"){std::cout<<"d2-debug-cdp r7\n";return 0;}
    @autoreleasepool {
        try {
            if(argc==2&&std::string(argv[1])=="--self-check")return CheckReferences();
            if(argc==4&&std::string(argv[1])=="--inspect-window")return InspectCdpWindow(std::stoi(argv[2]),[NSString stringWithUTF8String:argv[3]]);
            if(argc==3&&std::string(argv[1])=="--list-windows")return InspectCdpWindow(std::stoi(argv[2]),nil);
            if(argc==5&&std::string(argv[1])=="--record")return RecordCdp([NSString stringWithUTF8String:argv[2]],[NSString stringWithUTF8String:argv[3]],[NSString stringWithUTF8String:argv[4]]);
            if(argc!=2){std::cerr<<"Usage: d2smm-cdp WEBSOCKET < commands.json\n       d2smm-cdp --record WEBSOCKET RECIPE NEW_OUTPUT\n";return 1;}
            NSData *data=[[NSFileHandle fileHandleWithStandardInput] readDataToEndOfFile];
            id decoded=[NSJSONSerialization JSONObjectWithData:data options:0 error:nil];
            NSArray *commands=[decoded isKindOfClass:NSArray.class]?decoded:decoded?@[decoded]:@[];
            if(commands.count<1||commands.count>32)throw std::runtime_error("Expected 1–32 CDP commands");
            for(id value in commands)if(![value isKindOfClass:NSDictionary.class]||![value[@"method"]isKindOfClass:NSString.class])throw std::runtime_error("Invalid CDP command");
            CdpClient cdp([NSString stringWithUTF8String:argv[1]]);
            NSMutableArray *results=[NSMutableArray array];
            for(NSDictionary *command in commands){
                NSDictionary *reply=cdp.call(ResolveResult(command,results));
                NSData *json=[NSJSONSerialization dataWithJSONObject:reply options:0 error:nil];
                std::cout<<std::string((const char*)json.bytes,json.length)<<"\n";
                if(reply[@"error"]||reply[@"result"][@"exceptionDetails"])return 1;
                [results addObject:reply];
            }
            return 0;
        }catch(const std::exception& error){std::cerr<<error.what()<<"\n";return 1;}
    }
}
