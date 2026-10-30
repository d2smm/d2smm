#import "cdp_client.hpp"
#include <iostream>
#include <stdexcept>
#include <string>

int main(int argc,char **argv){
    if(argc==2&&std::string(argv[1])=="--version"){std::cout<<"d2-debug-cdp r5\n";return 0;}
    @autoreleasepool {
        try {
            if(argc==5&&std::string(argv[1])=="--record")return RecordCdp([NSString stringWithUTF8String:argv[2]],[NSString stringWithUTF8String:argv[3]],[NSString stringWithUTF8String:argv[4]]);
            if(argc!=2){std::cerr<<"Usage: d2smm-cdp WEBSOCKET < commands.json\n       d2smm-cdp --record WEBSOCKET RECIPE NEW_OUTPUT\n";return 1;}
            NSData *data=[[NSFileHandle fileHandleWithStandardInput] readDataToEndOfFile];
            id decoded=[NSJSONSerialization JSONObjectWithData:data options:0 error:nil];
            NSArray *commands=[decoded isKindOfClass:NSArray.class]?decoded:decoded?@[decoded]:@[];
            if(commands.count<1||commands.count>32)throw std::runtime_error("Expected 1–32 CDP commands");
            for(id value in commands)if(![value isKindOfClass:NSDictionary.class]||![value[@"method"]isKindOfClass:NSString.class])throw std::runtime_error("Invalid CDP command");
            CdpClient cdp([NSString stringWithUTF8String:argv[1]]);
            for(NSDictionary *command in commands){
                NSDictionary *reply=cdp.call(command);
                NSData *json=[NSJSONSerialization dataWithJSONObject:reply options:0 error:nil];
                std::cout<<std::string((const char*)json.bytes,json.length)<<"\n";
                if(reply[@"error"]||reply[@"result"][@"exceptionDetails"])return 1;
            }
            return 0;
        }catch(const std::exception& error){std::cerr<<error.what()<<"\n";return 1;}
    }
}
