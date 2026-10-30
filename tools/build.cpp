#include <nlohmann/json.hpp>
#include <openssl/evp.h>
#include <algorithm>
#include <filesystem>
#include <fstream>
#include <iomanip>
#include <iostream>
#include <memory>
#include <regex>
#include <sstream>
#include <stdexcept>
#include <string>

namespace fs = std::filesystem;
using Json = nlohmann::json;
using namespace std::string_literals;

namespace {
std::string read(const fs::path& path) {
    std::ifstream file(path, std::ios::binary);
    if (!file) throw std::runtime_error("Cannot read " + path.string());
    return {std::istreambuf_iterator<char>(file), std::istreambuf_iterator<char>()};
}
void write(const fs::path& path, const std::string& value) {
    fs::create_directories(path.parent_path());
    std::ofstream file(path, std::ios::binary | std::ios::trunc);
    file.write(value.data(), static_cast<std::streamsize>(value.size()));
    if (!file) throw std::runtime_error("Cannot write " + path.string());
}
std::string sha256(const std::string& value) {
    unsigned char bytes[EVP_MAX_MD_SIZE]; unsigned length = 0;
    if (!EVP_Digest(value.data(), value.size(), bytes, &length, EVP_sha256(), nullptr))
        throw std::runtime_error("SHA-256 failed");
    std::ostringstream out;
    for (unsigned i = 0; i < length; ++i)
        out << std::hex << std::setw(2) << std::setfill('0') << unsigned(bytes[i]);
    return out.str();
}
std::string base64(const std::string& value) {
    static constexpr char alphabet[] = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    std::string out; out.reserve((value.size()+2)/3*4);
    for (size_t i = 0; i < value.size(); i += 3) {
        const auto a = static_cast<unsigned char>(value[i]);
        const auto b = i+1 < value.size() ? static_cast<unsigned char>(value[i+1]) : 0;
        const auto c = i+2 < value.size() ? static_cast<unsigned char>(value[i+2]) : 0;
        out += alphabet[a >> 2]; out += alphabet[((a & 3) << 4) | (b >> 4)];
        out += i+1 < value.size() ? alphabet[((b & 15) << 2) | (c >> 6)] : '=';
        out += i+2 < value.size() ? alphabet[c & 63] : '=';
    }
    return out;
}
std::string uri(const std::string& value) {
    std::ostringstream out;
    for (unsigned char c : value) {
        if ((c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') ||
            (c >= '0' && c <= '9') || c == '-' || c == '_' || c == '.' || c == '~') out << c;
        else out << '%' << std::uppercase << std::hex << std::setw(2) << std::setfill('0') << unsigned(c);
    }
    return out.str();
}
void require(bool value, const std::string& message) {
    if (!value) throw std::runtime_error(message);
}
bool inside(const fs::path& path, const fs::path& root) {
    auto [a,b] = std::mismatch(root.begin(), root.end(), path.begin(), path.end());
    return a == root.end();
}
fs::path sourcePath(const fs::path& root, const std::string& relative) {
    const auto path = fs::weakly_canonical(root / relative);
    require(!fs::path(relative).is_absolute() && inside(path, root), "Source escapes repository: " + relative);
    return path;
}
void copyTree(const fs::path& from, const fs::path& to) {
    for (const auto& e : fs::recursive_directory_iterator(from)) {
        require(!e.is_symlink(), "Unexpected symlink: " + e.path().string());
        if (e.is_regular_file() && e.path().filename() != ".DS_Store")
            write(to / fs::relative(e.path(), from), read(e.path()));
    }
}
void replaceAll(std::string& text, const std::string& from, const std::string& to) {
    for (size_t at=0; (at=text.find(from,at))!=std::string::npos; at+=to.size())
        text.replace(at,from.size(),to);
}
void sitePreview(const fs::path& site, const fs::path& output) {
    auto html=read(site/"index.html"), css=read(site/"style.css");
    html=std::regex_replace(html,std::regex("<script[^>]*></script>"),"");
    replaceAll(html,"<link rel=\"stylesheet\" href=\"/style.css\">","");
    for (const auto& entry : fs::recursive_directory_iterator(site/"assets")) {
        if (!entry.is_regular_file()) continue;
        const auto ext=entry.path().extension().string();
        const std::string mime=ext==".webp"?"image/webp":ext==".png"?"image/png":ext==".ttf"?"font/ttf":"";
        if (mime.empty()) continue;
        const auto url="/"+fs::relative(entry.path(),site).generic_string();
        const auto data="data:"+mime+";base64,"+base64(read(entry.path()));
        replaceAll(html,url,data); replaceAll(css,url,data);
    }
    const std::string expression="(async()=>{if(location.origin!=='https://d2s.arken.gg')throw Error('Wrong site preview origin');document.open();document.write("+Json(html).dump()+");document.close();const style=document.createElement('style');style.textContent="+Json(css).dump()+";document.head.append(style);eval("+Json(read(site/"app.js")).dump()+");eval("+Json(read(site/"gallery.js")).dump()+");await document.fonts.ready;await Promise.all([...document.images].filter(image=>image.getAttribute('src')).map(image=>image.decode()));return{preview:true,images:document.images.length,title:document.querySelector('h1').textContent};})()";
    write(output,Json{{"method","Runtime.evaluate"},{"params",{{"expression",expression},{"awaitPromise",true},{"returnByValue",true}}}}.dump()+"\n");
}
void selfCheck() {
    require(sha256("abc") == "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad", "SHA-256 vector");
    require(base64("") == "" && base64("f") == "Zg==" && base64("fo") == "Zm8=" && base64("foo") == "Zm9v", "Base64 vectors");
    require(uri("a b/+~") == "a%20b%2F%2B~", "Bookmark encoding");
    const std::string unicode = "Gem \"on\"\n—";
    require(Json::parse(Json(unicode).dump()).get<std::string>() == unicode, "UTF-8 source quoting");
    require(inside("/project/dist", "/project") && !inside("/project-two", "/project"), "Output fence");
    std::cout << "Build boundary checks passed\n";
}
void checkSource(const fs::path& input) {
    const auto root = fs::canonical(input);
    const std::regex markdown("\\]\\(([^)]+)\\)"), image("src=\"([^\"]+)\"");
    size_t links = 0;
    for (const auto& folder : {root,root/"docs",root/"mods",root/"assets",root/"extension"}) {
        for (fs::recursive_directory_iterator it(folder), end; it != end; ++it) {
            if (it->is_directory() && folder == root) { it.disable_recursion_pending(); continue; }
            if (!it->is_regular_file() || it->path().extension() != ".md") continue;
            const auto text = read(it->path());
            for (const auto& pattern : {markdown,image}) {
                for (auto match = std::sregex_iterator(text.begin(),text.end(),pattern); match != std::sregex_iterator(); ++match) {
                    auto link = (*match)[1].str();
                    if (link.starts_with("https:") || link.starts_with("http:") || link.starts_with('#')) continue;
                    if (auto fragment=link.find('#'); fragment != std::string::npos) link.resize(fragment);
                    const auto target = fs::weakly_canonical(it->path().parent_path()/link);
                    require(inside(target,root) && fs::exists(target),"Broken local link in "+it->path().string()+": "+link);
                    ++links;
                }
            }
        }
    }
    std::cout << links << " local documentation links resolve\n";
}
void build(const fs::path& input, const fs::path& destination) {
    const auto root = fs::canonical(input), out = fs::weakly_canonical(destination);
    require(out != root && !inside(root,out), "Output may not contain the source repository");
    require(!inside(out,root) || inside(out,root/"dist"), "In-repository output must be under dist/");
    // Never erase an arbitrary populated output tree. Existing output is reusable only
    // when this builder owns it; individual current artifacts are then overwritten.
    require(!fs::exists(out) || fs::is_empty(out) || fs::exists(out/".d2smm-output"), "Output is not owned by d2smm-build");
    auto version = read(root/"VERSION");
    while (!version.empty() && (version.back()=='\n'||version.back()=='\r')) version.pop_back();
    require(std::regex_match(version,std::regex("[0-9]+\\.[0-9]+\\.[0-9]+")), "Invalid VERSION");
    const auto manifest = Json::parse(read(root/"src/bundle.json"));
    const auto packageText = read(root/"mods/loot-guard/mod.json");
    const auto pack = Json::parse(packageText);
    const auto modVersion = pack.at("version").get<std::string>();
    const std::string origin = "https://d2s.arken.gg";
    // Preserve the accepted 2.9.0 source bytes during the public-repository handoff.
    std::string source = "// Generated from mod-system/runtime by Build.command.\nglobalThis.D2ModsStartup=(async()=>{\n'use strict';\nif(location.origin!=='https://d2survivors.lol'||!location.pathname.startsWith('/play/'))return;\nif(globalThis.D2Mods?.version==='"+version+"')return globalThis.D2Mods;\n";
    for (const auto& path : manifest.at("early")) source += read(sourcePath(root,path.get<std::string>())) + "\n";
    source += "const bootStore=D2ModStore.create();let selection;try{selection=await bootStore.readRuntime();}finally{bootStore.close();}\nif(selection&&D2ModUpdates.newer(selection.version,'"+version+"'))return D2ModUpdates.loadRuntime(selection);\nif(globalThis.D2Mods)await globalThis.D2Mods.dispose();\n";
    source += "globalThis.D2ModsDefaultPackage=" + Json(packageText).dump() + ";\n";
    const auto pin = Json::parse(read(root/"vendor/acorn/source.json"));
    const auto parser = read(root/"vendor/acorn/generated/acorn.js"), license = read(root/"vendor/acorn/LICENSE");
    require(sha256(parser) == pin.at("sha256") && parser.size() == pin.at("bytes"), "Acorn source identity changed");
    require(sha256(license) == pin.at("licenseSha256"), "Acorn license identity changed");
    source += "/* Acorn " + pin.at("version").get<std::string>() + "\n" + license + "*/\n";
    source += "(()=>{const module={exports:{}};const exports=module.exports;\n"+parser+"\nglobalThis.D2JavaScriptParser=module.exports;})();\n";
    Json skin = Json::object();
    for (const auto& [name, entry] : manifest.at("skin").items())
        skin[name] = "data:"+entry.at("mime").get<std::string>()+";base64,"+base64(read(sourcePath(root,entry.at("path").get<std::string>())));
    source += "globalThis.D2ModSkin="+skin.dump()+";\n";
    for (const auto& path : manifest.at("runtime")) {
        auto module = read(sourcePath(root,path.get<std::string>()));
        if (path == "src/manager/manager.js") {
            const std::regex declaration("const VERSION='[0-9]+\\.[0-9]+\\.[0-9]+';");
            require(std::regex_search(module,declaration),"Manager version declaration missing");
            module = std::regex_replace(module,declaration,"const VERSION='"+version+"';");
        }
        source += module + "\n";
    }
    source += "await globalThis.D2Mods.ready;return globalThis.D2Mods;})();\n";
    require(source.size() <= 1048576, "Manager exceeds the installed updater's 1 MiB limit");
    const auto hash = sha256(source);
    Json descriptor = {{"version",version},{"url",origin+"/manager/"+version+"/bootstrap.js"},{"bytes",source.size()},{"sha256",hash}};
    std::string digestBytes;
    for (size_t i=0;i<hash.size();i+=2) digestBytes += static_cast<char>(std::stoul(hash.substr(i,2),nullptr,16));
    const auto sri = "sha256-"+base64(digestBytes);
    const auto bookmark = "javascript:"+uri("void(()=>{if(location.origin!=='https://d2survivors.lol'||!location.pathname.startsWith('/play/')){alert('Open D2 Survivors first');return;}if(globalThis.D2Mods){D2Mods.show();return;}globalThis.D2ModsBootstrap="+descriptor.dump()+";const s=document.createElement('script');s.src='"+descriptor.at("url").get<std::string>()+"';s.integrity='"+sri+"';s.crossOrigin='anonymous';s.onload=async()=>{await globalThis.D2ModsStartup;globalThis.D2Mods?.show();s.remove();};s.onerror=()=>alert('The mod manager could not be loaded.');document.head.append(s);})()");
    write(out/".d2smm-output","d2smm-build\n");
    write(out/"bootstrap.js",source);
    write(out/"bootstrap-record.json",descriptor.dump(2)+"\n");
    write(out/"bookmarklet.txt",bookmark+"\n");
    copyTree(root/"extension",out/"extension");
    auto extension = Json::parse(read(root/"extension/manifest.json")); extension["version"] = version;
    write(out/"extension/manifest.json",extension.dump(2)+"\n");
    write(out/"extension/generated/bootstrap.js","globalThis.D2ModsBootstrap="+descriptor.dump()+";\n"+source);
    copyTree(root/"site",out/"site");
    write(out/"site/assets/cinzel.ttf",read(root/"assets/fonts/cinzel.ttf"));
    write(out/"site/assets/font-license.txt",read(root/"assets/fonts/font-license.txt"));
    write(out/"site/assets/gem-on.webp",read(root/"assets/ui/gem-on.webp"));
    write(out/"site/assets/gem-off.webp",read(root/"assets/ui/gem-off.webp"));
    auto html = read(root/"site/index.html");
    html = std::regex_replace(html,std::regex("data-manager-version>[0-9]+\\.[0-9]+\\.[0-9]+"),"data-manager-version>"+version);
    write(out/"site/index.html",html);
    write(out/"site/manager"/version/"bootstrap.js",source);
    write(out/"site/mods/loot-guard"/(modVersion+".d2mod.json"),packageText);
    write(out/"site/rules.txt",read(root/"mods/loot-guard/RULES.txt"));
    const Json mod = {{"id","loot-guard"},{"version",modVersion},{"url",origin+"/mods/loot-guard/"+modVersion+".d2mod.json"},{"bytes",packageText.size()},{"sha256",sha256(packageText)}};
    const Json feed = {{"schema","d2mods.updates.v1"},{"channel","stable"},{"manager",descriptor},{"mods",Json::array({mod})}};
    write(out/"site/updates/stable.json",feed.dump(2)+"\n");
    sitePreview(out/"site",out/"site-preview-command.json");
    // Development commands stay outside the hosted site and runtime bundle.
    const auto guard = "if(!globalThis.__D2GalleryLease?.contextId||location.origin!=='https://d2survivors.lol')throw Error('Verified isolated gallery context required');";
    const auto load = "(async()=>{"+std::string(guard)+"const before=localStorage.getItem('d2-survivors/save/v1');globalThis.D2ModsBootstrap="+descriptor.dump()+";eval("+Json(source).dump()+");await D2ModsStartup;await D2Mods.ready;if(before!==localStorage.getItem('d2-survivors/save/v1'))throw Error('Candidate load changed native save');return{version:D2Mods.version,saveUnchanged:true};})()";
    write(out/"gallery-load-command.json",Json({{"method","Runtime.evaluate"},{"params",{{"expression",load},{"awaitPromise",true},{"returnByValue",true}}}}).dump()+"\n");
    Json fixtureSources=Json::array();
    for(const auto& name:{"base-kinds.js","rule-catalog.js","rules.js","alerts.js","adapter.js"})fixtureSources.push_back(read(root/"mods/loot-guard/runtime"/name));
    const auto fixtures=Json::parse(read(root/"tests/fixtures/gallery.json"));
    const auto fixtureScript=read(root/"tests/browser/gallery-scenes.js")+"\ninstallGalleryScenes("+fixtures.dump()+","+fixtureSources.dump()+")";
    write(out/"gallery-fixtures-command.json",Json({{"method","Runtime.evaluate"},{"params",{{"expression",fixtureScript},{"awaitPromise",true},{"returnByValue",true}}}}).dump()+"\n");
    const auto& menu=fixtures.at("menu");
    const Json menuCommands=Json::array({
        {{"method","Runtime.evaluate"},{"params",{{"expression","(()=>{if(!globalThis.D2GalleryScenes||D2Characters.currentGame()?.state!=='camp'||!D2Mods.status().gameMenu.connected)throw Error('Start the isolated camp fixture first');D2GalleryScenes.clear();D2Mods.focusGame();return true;})()"},{"returnByValue",true}}}},
        {{"method","Emulation.setDeviceMetricsOverride"},{"params",menu.at("viewport")}},
        {{"method","Input.dispatchKeyEvent"},{"params",{{"type","keyDown"},{"key","Escape"},{"code","Escape"},{"windowsVirtualKeyCode",27}}}},
        {{"method","Input.dispatchKeyEvent"},{"params",{{"type","keyUp"},{"key","Escape"},{"code","Escape"},{"windowsVirtualKeyCode",27}}}},
        {{"method","Runtime.evaluate"},{"params",{{"expression","new Promise(r=>setTimeout(r,1200))"},{"awaitPromise",true}}}},
        {{"method","Input.dispatchMouseEvent"},{"params",{{"type","mouseMoved"},{"x",menu.at("hover").at("x")},{"y",menu.at("hover").at("y")}}}},
        {{"method","Runtime.evaluate"},{"params",{{"expression","new Promise(r=>setTimeout(()=>r({paused:D2Characters.currentGame()?.state==='paused',saveUnchanged:D2GalleryScenes.status().nativeSaveUnchanged}),350))"},{"awaitPromise",true},{"returnByValue",true}}}},
        {{"method","Page.captureScreenshot"},{"params",{{"format","png"},{"clip",menu.at("crop")}}}},
        {{"method","Emulation.clearDeviceMetricsOverride"}}
    });
    write(out/"gallery-menu-command.json",menuCommands.dump()+"\n");
    std::cout << "D2SMM " << version << ": " << source.size() << " bytes\nSHA-256 " << hash << "\nOutput " << out << '\n';
}
} // namespace

int main(int argc, char** argv) {
    // Version is deliberately evaluated before any path, crypto or output work.
    if (argc==2 && std::string(argv[1])=="--version") { std::cout<<"d2smm-build 1.0.0\n"; return 0; }
    try {
        if (argc==2 && std::string(argv[1])=="--self-check") { selfCheck(); return 0; }
        if (argc==3 && std::string(argv[1])=="--check-source") { checkSource(argv[2]); return 0; }
        if (argc!=5 || std::string(argv[1])!="--source" || std::string(argv[3])!="--output") {
            std::cerr<<"Usage: d2smm-build --source REPOSITORY --output OUTPUT\n"; return 2;
        }
        build(argv[2],argv[4]); return 0;
    } catch (const std::exception& error) { std::cerr<<"Build failed: "<<error.what()<<'\n'; return 1; }
}
