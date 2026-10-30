#include <nlohmann/json.hpp>
#include <filesystem>
#include <fstream>
#include <iostream>
#include <sstream>
#include <stdexcept>
#include <string>
#include <vector>
#include <spawn.h>
#include <sys/wait.h>
extern char **environ;
namespace fs=std::filesystem;
using Json=nlohmann::ordered_json;

static void run(std::vector<std::string> args){
    // CX owns native FFmpeg invocation/telemetry; no shell interpolation.
    args.insert(args.begin(),{"cx","--","ffmpeg","-hide_banner","-loglevel","error","-threads","2","-filter_complex_threads","2","-y"});
    std::vector<char*> argv;for(auto& a:args)argv.push_back(a.data());argv.push_back(nullptr);
    pid_t pid=0;if(posix_spawnp(&pid,argv[0],nullptr,nullptr,argv.data(),environ))throw std::runtime_error("Cannot launch native FFmpeg through CX");
    int status=0;if(waitpid(pid,&status,0)<0||!WIFEXITED(status)||WEXITSTATUS(status))throw std::runtime_error("FFmpeg failed");
}
static std::string path(const fs::path& p){return fs::absolute(p).string();}
static std::string number(double value){std::ostringstream s;s<<value;return s.str();}
static std::string escaped(std::string value){std::string out;for(char c:value){if(c=='\''||c==':'||c=='\\')out+='\\';out+=c;}return out;}
static void write(const fs::path& p,const std::string& value){std::ofstream f(p);if(!(f<<value))throw std::runtime_error("Cannot write "+p.string());}
static std::vector<std::string> outputArgs(const fs::path& out,double duration){return {"-t",number(duration),"-an","-c:v","libx264","-threads","2","-preset","fast","-crf","18","-pix_fmt","yuv420p","-movflags","+faststart",path(out)};}
static void append(std::vector<std::string>& args,std::vector<std::string> more){args.insert(args.end(),more.begin(),more.end());}

static void encode(const fs::path& capture,const fs::path& out){
    Json receipt;std::ifstream(capture/"record.json")>>receipt;
    if(!receipt.value("passed",false))throw std::runtime_error("Capture has no passing receipt");
    fs::create_directories(out.parent_path());
    std::vector<std::string> args={"-safe","0","-f","concat","-i",path(capture/"frames.ffconcat"),"-vf","fps=30,setsar=1"};
    append(args,outputArgs(out,receipt.at("durationMs").get<double>()/1000));run(args);
}
static void render(const fs::path& repo,const fs::path& media,const fs::path& out,const fs::path& captureMap={}){
    Json edit;std::ifstream(repo/"media/promo/edit.json")>>edit;
    if(edit.at("schema")!="d2smm.promo-edit.v1")throw std::runtime_error("Unknown edit schema");
    const bool upload=!captureMap.empty();Json captures;
    if(upload){std::ifstream(captureMap)>>captures;if(captures.at("schema")!="d2smm.promo-captures.v1")throw std::runtime_error("Unknown capture map");if(fs::exists(out))throw std::runtime_error("Upload export already exists; choose a new name");}
    const auto work=upload?out.parent_path()/(out.stem().string()+"-work"):media/"edit";
    if(upload&&fs::exists(work))throw std::runtime_error("Upload working directory already exists; choose a new export name");
    fs::create_directories(work);fs::create_directories(out.parent_path());
    const std::string font=escaped(path(repo/"assets/fonts/cinzel.ttf"));
    std::vector<fs::path> rendered;std::vector<double> durations;
    for(const auto& scene:edit.at("scenes")){
        const std::string id=scene.at("id"),kind=scene.at("kind");const double duration=scene.at("duration");
        fs::path input=kind=="clip"?media/"clips"/scene.at("source").get<std::string>():repo/scene.at("source").get<std::string>();
        if(upload&&kind=="clip"){
            const fs::path capture=captures.at("captures").at(id).get<std::string>();
            if(!capture.is_absolute())throw std::runtime_error("Capture paths must be absolute");
            Json receipt;std::ifstream(capture/"record.json")>>receipt;
            if(!receipt.value("passed",false)||receipt.at("durationMs").get<double>()/1000<duration+scene.value("startSeconds",0.0))throw std::runtime_error("Capture is unverified or shorter than scene "+id);
            input=capture/"frames.ffconcat";
        }
        if(!fs::is_regular_file(input))throw std::runtime_error("Missing source "+input.string());
        const auto box=scene.at("box");const int x=box[0],y=box[1],w=box[2],h=box[3];
        const auto title=work/(id+"-title.txt"),sub=work/(id+"-subtitle.txt");write(title,scene.at("title"));write(sub,scene.at("subtitle"));
        std::vector<std::string> args={"-loop","1","-i",path(repo/"site/assets/cathedral.webp")};
        if(kind=="still")append(args,{"-loop","1"});else{if(upload)append(args,{"-safe","0","-f","concat"});else append(args,{"-stream_loop","-1"});if(scene.contains("startSeconds"))append(args,{"-ss",number(scene.at("startSeconds"))});}append(args,{"-i",path(input)});
        const std::string color=upload?":flags=lanczos:out_color_matrix=bt709:out_range=tv":"";
        std::string filter="[0:v]scale=1920:1080:force_original_aspect_ratio=increase"+color+",crop=1920:1080,eq=brightness=-0.21:saturation=0.55,boxblur=6:1,fps=30,setsar=1[bg];[1:v]";
        if(scene.contains("crop")){auto c=scene["crop"];filter+="crop="+number(c[2])+":"+number(c[3])+":"+number(c[0])+":"+number(c[1])+",";}
        filter+="scale="+std::to_string(w)+":"+std::to_string(h)+":force_original_aspect_ratio=decrease"+color+",fps=30,setsar=1";
        if(kind=="still")filter+=",scale=w='trunc(iw*(1+0.025*t/"+number(duration)+")/2)*2':h=-2:eval=frame";
        filter+="[fg];[bg][fg]overlay=x='"+std::to_string(x)+"+("+std::to_string(w)+"-w)/2':y='"+std::to_string(y)+"+("+std::to_string(h)+"-h)/2':shortest=1";
        filter+=",drawtext=fontfile='"+font+"':textfile='"+escaped(path(title))+"':fontcolor=0xd8c292:fontsize=43:x=(w-tw)/2:y=54:shadowcolor=black:shadowy=3";
        filter+=",drawtext=fontfile='"+font+"':textfile='"+escaped(path(sub))+"':fontcolor=0xc1b191:fontsize="+std::string(id=="outro"?"42":"22")+":x=(w-tw)/2:y=1020:shadowcolor=black:shadowy=2";
        filter+=",fade=t=in:st=0:d=0.25,fade=t=out:st="+number(duration-.3)+":d=0.3,";
        filter+=upload?"format=yuv444p,setparams=range=limited:color_primaries=bt709:color_trc=bt709:colorspace=bt709[v]":"format=yuv420p[v]";
        write(work/(id+".ffscript"),filter);
        append(args,{"-filter_complex",filter,"-map","[v]"});
        const auto clip=work/(id+(upload?".mkv":".mp4"));
        if(upload)append(args,{"-t",number(duration),"-an","-c:v","ffv1","-level","3","-threads","2","-pix_fmt","yuv444p",path(clip)});else append(args,outputArgs(clip,duration));
        run(args);rendered.push_back(clip);durations.push_back(duration);
        std::cout<<"Rendered "<<id<<"\n"<<std::flush;
    }
    // Individual scene masters make later timing/caption changes inexpensive.
    std::string concat="ffconcat version 1.0\n";double duration=0;
    for(std::size_t i=0;i<rendered.size();++i){concat+="file '"+rendered[i].filename().string()+"'\n";duration+=durations[i];}
    write(work/"master.ffconcat",concat);
    const auto silent=work/(upload?"master-silent.mkv":"master-silent.mp4");
    std::vector<std::string> join={"-safe","0","-f","concat","-i",path(work/"master.ffconcat"),"-c","copy"};if(!upload)append(join,{"-movflags","+faststart"});append(join,{path(silent)});run(join);
    // Original deterministic ambient score: low fifths, an airy upper interval,
    // slow amplitude movement and a bell at the simulated rare-drop reveal.
    const std::string score="aevalsrc=0.075*sin(2*PI*55*t)*(0.7+0.3*sin(2*PI*0.07*t))+0.045*sin(2*PI*82.4069*t)+0.023*sin(2*PI*110*t)*(0.7+0.3*sin(2*PI*0.11*t))+0.012*sin(2*PI*164.814*t)+0.008*sin(2*PI*220*t)+if(gte(t\\,49.1)\\,0.07*exp(-1.4*(t-49.1))*sin(2*PI*659.255*t)+0.025*exp(-2*(t-49.1))*sin(2*PI*987.766*t)\\,0):s=48000:d="+number(duration);
    const auto audio=(upload?work:media)/"ambient-score.wav";
    run({"-f","lavfi","-i",score,"-af","aecho=0.8:0.5:170|360:0.15|0.12,lowpass=f=3500,volume="+number(edit.value("audioGain",1.0))+",afade=t=in:d=3,afade=t=out:st="+number(duration-4)+":d=4","-t",number(duration),"-c:a","pcm_s16le",path(audio)});
    if(upload){
        const std::vector<std::string> settings={"-c:v","libx264","-threads","2","-preset","slow","-profile:v","high","-level:v","4.1","-b:v","10M","-maxrate","16M","-bufsize","20M","-g","15","-keyint_min","15","-sc_threshold","0","-bf","2","-flags","+cgop","-pix_fmt","yuv420p","-color_range","tv","-colorspace","bt709","-color_primaries","bt709","-color_trc","bt709","-passlogfile",path(work/"x264-pass")};
        std::vector<std::string> first={"-i",path(silent),"-map","0:v","-an"};append(first,settings);append(first,{"-pass","1","-f","null","/dev/null"});run(first);
        std::vector<std::string> second={"-i",path(silent),"-i",path(audio),"-map","0:v","-map","1:a"};append(second,settings);append(second,{"-pass","2","-c:a","aac","-b:a","384k","-ar","48000","-ac","2","-t",number(duration),"-movflags","+faststart",path(out)});run(second);
    }else run({"-i",path(silent),"-i",path(audio),"-map","0:v","-map","1:a","-c:v","copy","-c:a","aac","-b:a","192k","-shortest","-movflags","+faststart",path(out)});
    write(upload?fs::path(path(out)+".json"):media/"edit-receipt.json",Json({{"schema","d2smm.promo-result.v1"},{"durationSeconds",duration},{"output",path(out)},{"edit",edit},{"profile",upload?"youtube-1080p30-two-pass-10mbps":"preview-crf18"},{"captures",captures},{"simulated","Bookmark chrome/drag, synthetic heroes and rare drop; accepted loadout stills"},{"published",false}}).dump(2)+"\n");
}
int main(int argc,char**argv){
    if(argc==2&&std::string(argv[1])=="--version"){std::cout<<"d2smm-media 1.1.0\n";return 0;}
    try{if(argc==4&&std::string(argv[1])=="--encode"){encode(argv[2],argv[3]);return 0;}if(argc==5&&std::string(argv[1])=="--render"){render(argv[2],argv[3],argv[4]);return 0;}if(argc==6&&std::string(argv[1])=="--render-upload"){render(argv[2],argv[3],argv[5],argv[4]);return 0;}std::cerr<<"d2smm-media --encode CAPTURE MP4\nd2smm-media --render REPO MEDIA_ROOT MP4\nd2smm-media --render-upload REPO MEDIA_ROOT CAPTURE_MAP MP4\n";return 2;}catch(const std::exception& error){std::cerr<<error.what()<<"\n";return 1;}
}
