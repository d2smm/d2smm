#pragma once
#import <Foundation/Foundation.h>
#include <functional>
#include <memory>

class CdpClient {
    struct Impl;
    std::unique_ptr<Impl> impl_;
public:
    std::function<void(NSDictionary*)> onEvent;
    explicit CdpClient(NSString *address);
    ~CdpClient();
    int send(NSDictionary *command);
    void poll(int milliseconds);
    NSDictionary *call(NSDictionary *command);
    NSDictionary *checked(NSDictionary *command);
};
int RecordCdp(NSString *address, NSString *recipePath, NSString *outputPath);
