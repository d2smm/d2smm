#import <ApplicationServices/ApplicationServices.h>
#import <Foundation/Foundation.h>
#include <iostream>
#include <stdexcept>

namespace {
id Attribute(AXUIElementRef element,CFStringRef name){
    CFTypeRef value=nullptr;
    const AXError error=AXUIElementCopyAttributeValue(element,name,&value);
    if(error==kAXErrorNoValue||error==kAXErrorAttributeUnsupported)return nil;
    if(error!=kAXErrorSuccess)throw std::runtime_error("Native window accessibility read failed");
    return CFBridgingRelease(value);
}
void Labels(AXUIElementRef element,NSMutableArray *out,unsigned depth,unsigned& count){
    if(depth>9||++count>300)return;
    NSMutableDictionary *row=[NSMutableDictionary dictionary];
    for(NSString *key in @[@"AXRole",@"AXTitle",@"AXDescription",@"AXHelp",@"AXIdentifier"]){id value=Attribute(element,(__bridge CFStringRef)key);if([value isKindOfClass:NSString.class]&&[value length])row[key]=value;}
    if(row.count)[out addObject:row];
    id children=Attribute(element,kAXChildrenAttribute);
    if([children isKindOfClass:NSArray.class])for(id child in children)Labels((__bridge AXUIElementRef)child,out,depth+1,count);
}
}
int InspectCdpWindow(pid_t pid,NSString *title){
    if(pid<=0)throw std::runtime_error("Exact browser PID required");
    if(!AXIsProcessTrusted())throw std::runtime_error("Native window inspection lacks Accessibility access");
    AXUIElementRef app=AXUIElementCreateApplication(pid);id windows;
    try{windows=Attribute(app,kAXWindowsAttribute);}catch(...){CFRelease(app);throw;}CFRelease(app);
    if(!title){NSMutableArray *names=[NSMutableArray array];for(id window in windows)[names addObject:Attribute((__bridge AXUIElementRef)window,kAXTitleAttribute)?:@""];NSData *json=[NSJSONSerialization dataWithJSONObject:@{@"pid":@(pid),@"windowTitles":names} options:0 error:nil];std::cout<<std::string((const char*)json.bytes,json.length)<<"\n";return 0;}
    if(!title.length)throw std::runtime_error("Exact window title required");
    NSMutableArray *matches=[NSMutableArray array];
    for(id window in windows){id actual=Attribute((__bridge AXUIElementRef)window,kAXTitleAttribute);if([actual isKindOfClass:NSString.class]&&[actual containsString:title])[matches addObject:window];}
    if(matches.count!=1)throw std::runtime_error("Native window title is absent or ambiguous");
    NSMutableArray *labels=[NSMutableArray array];unsigned count=0;Labels((__bridge AXUIElementRef)matches[0],labels,0,count);
    NSData *json=[NSJSONSerialization dataWithJSONObject:@{@"pid":@(pid),@"titleMatch":title,@"labels":labels} options:0 error:nil];
    std::cout<<std::string((const char*)json.bytes,json.length)<<"\n";return 0;
}
