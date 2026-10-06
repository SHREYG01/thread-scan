#pragma once

#include <string>
#include <vector>
#include <sstream>
#include <iomanip>
#include <cstdint>
#include <algorithm>

namespace ThreadScan {

class JsonValue {
public:
    static std::string escapeString(const std::string& s) {
        std::ostringstream o;
        for (char c : s) {
            switch (c) {
                case '"': o << "\\\""; break;
                case '\\': o << "\\\\"; break;
                case '\b': o << "\\b"; break;
                case '\f': o << "\\f"; break;
                case '\n': o << "\\n"; break;
                case '\r': o << "\\r"; break;
                case '\t': o << "\\t"; break;
                default:
                    if (static_cast<unsigned char>(c) <= 0x1f) {
                        o << "\\u" << std::hex << std::setw(4) << std::setfill('0') << static_cast<int>(c);
                    } else {
                        o << c;
                    }
            }
        }
        return o.str();
    }

    static std::string stringVal(const std::string& s) {
        return "\"" + escapeString(s) + "\"";
    }

    static std::string intVal(int64_t v) {
        return std::to_string(v);
    }

    static std::string uintVal(uint64_t v) {
        return std::to_string(v);
    }

    static std::string doubleVal(double v) {
        std::ostringstream o;
        o << std::fixed << std::setprecision(2) << v;
        return o.str();
    }

    static std::string boolVal(bool b) {
        return b ? "true" : "false";
    }
};

class JsonParser {
public:
    static std::string getString(const std::string& json, const std::string& key, const std::string& defaultVal = "") {
        std::string pattern = "\"" + key + "\"";
        size_t pos = json.find(pattern);
        if (pos == std::string::npos) return defaultVal;

        pos = json.find(':', pos + pattern.length());
        if (pos == std::string::npos) return defaultVal;

        pos = json.find_first_not_of(" \t\r\n", pos + 1);
        if (pos == std::string::npos) return defaultVal;

        if (json[pos] == '"') {
            std::string result;
            bool escaped = false;
            for (size_t i = pos + 1; i < json.size(); ++i) {
                char c = json[i];
                if (escaped) {
                    if (c == 'n') result += '\n';
                    else if (c == 't') result += '\t';
                    else if (c == 'r') result += '\r';
                    else if (c == '\\') result += '\\';
                    else if (c == '/') result += '/';
                    else if (c == '"') result += '"';
                    else result += c;
                    escaped = false;
                } else if (c == '\\') {
                    escaped = true;
                } else if (c == '"') {
                    return result;
                } else {
                    result += c;
                }
            }
        }
        return defaultVal;
    }

    static int getInt(const std::string& json, const std::string& key, int defaultVal = 0) {
        std::string pattern = "\"" + key + "\"";
        size_t pos = json.find(pattern);
        if (pos == std::string::npos) return defaultVal;

        pos = json.find(':', pos + pattern.length());
        if (pos == std::string::npos) return defaultVal;

        pos = json.find_first_not_of(" \t\r\n", pos + 1);
        if (pos == std::string::npos) return defaultVal;

        size_t endPos = json.find_first_of(",}\r\n ", pos);
        std::string valStr = json.substr(pos, endPos - pos);
        try {
            return std::stoi(valStr);
        } catch (...) {
            return defaultVal;
        }
    }
};

} // namespace ThreadScan
