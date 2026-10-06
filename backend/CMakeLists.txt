cmake_minimum_required(VERSION 3.15)
project(ThreadScanBackend VERSION 1.0.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

# Include directories
include_directories(${CMAKE_CURRENT_SOURCE_DIR}/src)

# Source files
set(SOURCES
    src/main.cpp
    src/Sha256.cpp
    src/ThreadPool.cpp
    src/FileScanner.cpp
    src/FileHasher.cpp
    src/DuplicateDetector.cpp
    src/Benchmark.cpp
    src/ApiServer.cpp
)

add_executable(thread_scan_server ${SOURCES})

# Windows Socket link
if(WIN32)
    target_link_libraries(thread_scan_server PRIVATE ws2_32)
endif()

if(MSVC)
    target_compile_options(thread_scan_server PRIVATE /W4 /O2)
else()
    target_compile_options(thread_scan_server PRIVATE -Wall -Wextra -O2 -pthread)
endif()
