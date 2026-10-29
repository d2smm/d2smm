#import <Foundation/Foundation.h>
#include <iostream>
#include <string>

// Bounded command transport for the explicitly authorized debug Chrome.
// Reads one JSON CDP command or a sequential command array from stdin; never discovers or closes a browser.
int main(int argc, char **argv) {
    if (argc==2 && std::string(argv[1])=="--version") { std::cout<<"d2-debug-cdp r3\n"; return 0; }
    @autoreleasepool {
        if (argc!=2) { std::cerr<<"Usage: d2-debug-cdp WEBSOCKET_URL < command.json\n"; return 1; }
        NSURL *url=[NSURL URLWithString:[NSString stringWithUTF8String:argv[1]]];
        if (![url.host isEqual:@"127.0.0.1"] || ![url.scheme isEqual:@"ws"]) return 1;
        NSData *input=[[NSFileHandle fileHandleWithStandardInput] readDataToEndOfFile];
        NSError *error=nil;
        id decoded=[NSJSONSerialization JSONObjectWithData:input options:0 error:&error];
        NSArray *commands=[decoded isKindOfClass:NSArray.class] ? decoded : decoded ? @[decoded] : @[];
        if (commands.count<1 || commands.count>32) return 1;
        for (id value in commands) if (![value isKindOfClass:NSDictionary.class] || ![value[@"method"] isKindOfClass:NSString.class]) return 1;
        NSURLSession *session=[NSURLSession sessionWithConfiguration:NSURLSessionConfiguration.ephemeralSessionConfiguration];
        NSURLSessionWebSocketTask *socket=[session webSocketTaskWithURL:url]; socket.maximumMessageSize=64*1024*1024; [socket resume];
        int commandId=0;
        for (NSDictionary *value in commands) {
        NSMutableDictionary *command=[value mutableCopy];command[@"id"]=@(++commandId);
        NSData *payload=[NSJSONSerialization dataWithJSONObject:command options:0 error:&error];
        bool completed=false;
        dispatch_semaphore_t sent=dispatch_semaphore_create(0);
        __block NSError *sendError=nil;
        [socket sendMessage:[[NSURLSessionWebSocketMessage alloc] initWithString:[[NSString alloc] initWithData:payload encoding:NSUTF8StringEncoding]] completionHandler:^(NSError *e) { sendError=e; dispatch_semaphore_signal(sent); }];
        if (dispatch_semaphore_wait(sent,dispatch_time(DISPATCH_TIME_NOW,15*NSEC_PER_SEC)) || sendError) { std::cerr<<"CDP send failed\n"; return 1; }
        for (int i=0;i<100;++i) {
            dispatch_semaphore_t received=dispatch_semaphore_create(0);
            __block NSURLSessionWebSocketMessage *reply=nil; __block NSError *readError=nil;
            [socket receiveMessageWithCompletionHandler:^(NSURLSessionWebSocketMessage *m,NSError *e) { reply=m; readError=e; dispatch_semaphore_signal(received); }];
            if (dispatch_semaphore_wait(received,dispatch_time(DISPATCH_TIME_NOW,55*NSEC_PER_SEC)) || readError) { std::cerr<<"CDP response failed\n"; return 1; }
            NSData *data=reply.data ?: [reply.string dataUsingEncoding:NSUTF8StringEncoding];
            NSDictionary *response=[NSJSONSerialization JSONObjectWithData:data options:0 error:&error];
            if ([response[@"id"] intValue]==commandId) {
                std::cout<<std::string((const char *)data.bytes,data.length)<<"\n";
                if (response[@"error"]) return 1;
                completed=true;break;
            }
        }
        if (!completed) { std::cerr<<"CDP response limit reached\n"; return 1; }
        }
        [socket cancelWithCloseCode:NSURLSessionWebSocketCloseCodeNormalClosure reason:nil];[session invalidateAndCancel];return 0;
    }
}
