#import "cdp_client.hpp"
#include <chrono>
#include <condition_variable>
#include <deque>
#include <mutex>
#include <stdexcept>

struct Inbox {
    std::mutex mutex;
    std::condition_variable changed;
    std::deque<NSDictionary*> messages;
    std::string failure;
};
@interface D2CdpReader : NSObject {
@public
    std::shared_ptr<Inbox> inbox;
}
@property(nonatomic,strong) NSURLSessionWebSocketTask *socket;
@property(atomic) BOOL active;
-(void)receive;
@end
@implementation D2CdpReader
-(void)receive {
    if (!self.active) return;
    [self.socket receiveMessageWithCompletionHandler:^(NSURLSessionWebSocketMessage *message,NSError *error) {
        if (!self.active) return;
        {
            std::lock_guard<std::mutex> lock(self->inbox->mutex);
            if (error) self->inbox->failure="CDP receive failed";
            else {
                NSData *data=message.data ?: [message.string dataUsingEncoding:NSUTF8StringEncoding];
                NSDictionary *reply=[NSJSONSerialization JSONObjectWithData:data options:0 error:nil];
                if (!reply || self->inbox->messages.size()>512) self->inbox->failure="CDP receive overflow or invalid JSON";
                else self->inbox->messages.push_back(reply);
            }
        }
        self->inbox->changed.notify_one();
        if (!error) [self receive];
    }];
}
@end

struct CdpClient::Impl {
    NSURLSession *session;
    D2CdpReader *reader;
    std::shared_ptr<Inbox> inbox=std::make_shared<Inbox>();
    int nextId=0;
    NSDictionary *receive(int ms) {
        std::unique_lock<std::mutex> lock(inbox->mutex);
        inbox->changed.wait_for(lock,std::chrono::milliseconds(ms),[&]{return !inbox->messages.empty()||!inbox->failure.empty();});
        if (!inbox->failure.empty()) throw std::runtime_error(inbox->failure);
        if (inbox->messages.empty()) return nil;
        NSDictionary *value=inbox->messages.front();inbox->messages.pop_front();return value;
    }
};
CdpClient::CdpClient(NSString *address):impl_(std::make_unique<Impl>()) {
    NSURL *url=[NSURL URLWithString:address];
    if (![url.host isEqual:@"127.0.0.1"]||![url.scheme isEqual:@"ws"]) throw std::runtime_error("Only loopback CDP is admitted");
    impl_->session=[NSURLSession sessionWithConfiguration:NSURLSessionConfiguration.ephemeralSessionConfiguration];
    impl_->reader=[D2CdpReader new];impl_->reader->inbox=impl_->inbox;
    impl_->reader.socket=[impl_->session webSocketTaskWithURL:url];impl_->reader.socket.maximumMessageSize=64*1024*1024;
    impl_->reader.active=YES;[impl_->reader.socket resume];[impl_->reader receive];
}
CdpClient::~CdpClient(){impl_->reader.active=NO;[impl_->reader.socket cancelWithCloseCode:NSURLSessionWebSocketCloseCodeNormalClosure reason:nil];[impl_->session invalidateAndCancel];}
int CdpClient::send(NSDictionary *value) {
    if (![value[@"method"] isKindOfClass:NSString.class]) throw std::runtime_error("Missing CDP method");
    NSMutableDictionary *command=[value mutableCopy];const int id=++impl_->nextId;command[@"id"]=@(id);
    NSData *data=[NSJSONSerialization dataWithJSONObject:command options:0 error:nil];
    const auto inbox=impl_->inbox;
    [impl_->reader.socket sendMessage:[[NSURLSessionWebSocketMessage alloc] initWithString:[[NSString alloc] initWithData:data encoding:NSUTF8StringEncoding]] completionHandler:^(NSError *error){
        if(error){std::lock_guard<std::mutex> lock(inbox->mutex);inbox->failure="CDP send failed";inbox->changed.notify_one();}
    }];return id;
}
void CdpClient::poll(int ms){NSDictionary *reply=impl_->receive(ms);if(reply[@"method"]&&onEvent)onEvent(reply);}
NSDictionary *CdpClient::call(NSDictionary *command){
    const int id=send(command);const auto deadline=std::chrono::steady_clock::now()+std::chrono::seconds(55);
    while(std::chrono::steady_clock::now()<deadline){NSDictionary *reply=impl_->receive(100);if([reply[@"id"] intValue]==id)return reply;if(reply[@"method"]&&onEvent)onEvent(reply);}
    throw std::runtime_error("CDP response timeout");
}
NSDictionary *CdpClient::checked(NSDictionary *command){
    NSDictionary *reply=call(command);
    if(reply[@"error"]||reply[@"result"][@"exceptionDetails"]){NSData *data=[NSJSONSerialization dataWithJSONObject:reply options:0 error:nil];throw std::runtime_error([[NSString alloc]initWithData:data encoding:NSUTF8StringEncoding].UTF8String);}
    return reply[@"result"];
}
