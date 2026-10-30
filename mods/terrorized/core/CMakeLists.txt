add_library(d2smm-terrorized-core STATIC core.cpp gather.cpp math.cpp)
target_include_directories(d2smm-terrorized-core PUBLIC "${CMAKE_CURRENT_SOURCE_DIR}")
add_executable(d2smm-terrorized-checks "${PROJECT_SOURCE_DIR}/tests/terrorized-core.cpp" "${PROJECT_SOURCE_DIR}/tests/terrorized-gather.cpp")
target_link_libraries(d2smm-terrorized-checks PRIVATE d2smm-terrorized-core)
add_test(NAME terrorized-policy COMMAND d2smm-terrorized-checks)
add_test(NAME terrorized-version COMMAND d2smm-terrorized-checks --version)
set_tests_properties(terrorized-version PROPERTIES TIMEOUT 5 PASS_REGULAR_EXPRESSION "d2smm-terrorized-checks 1.0.0")

set(D2SMM_WASM_CXX "" CACHE FILEPATH "Explicit native Clang compiler for regenerating the committed Terrorized Wasm")
if(D2SMM_WASM_CXX)
  if(NOT IS_ABSOLUTE "${D2SMM_WASM_CXX}" OR NOT EXISTS "${D2SMM_WASM_CXX}")
    message(FATAL_ERROR "D2SMM_WASM_CXX must be an existing absolute native Clang path")
  endif()
  set(terrorized_wasm "${PROJECT_BINARY_DIR}/generated/terrorized.wasm")
  add_custom_command(OUTPUT "${terrorized_wasm}"
    COMMAND "${CMAKE_COMMAND}" -E make_directory "${PROJECT_BINARY_DIR}/generated"
    COMMAND "${D2SMM_WASM_CXX}" --target=wasm32 -std=c++20 -O2 -nostdlib -fno-exceptions -fno-rtti
      "${CMAKE_CURRENT_SOURCE_DIR}/core.cpp" "${CMAKE_CURRENT_SOURCE_DIR}/gather.cpp" "${CMAKE_CURRENT_SOURCE_DIR}/wasm.cpp"
      -Wl,--no-entry -Wl,--strip-all
      -Wl,--export=terrorized_offer -Wl,--export=terrorized_begin
      -Wl,--export=terrorized_invalidate -Wl,--export=terrorized_tier -Wl,--export=terrorized_act
      -Wl,--export=gather_observe -Wl,--export=gather_add -Wl,--export=gather_layout
      -Wl,--export=gather_ideal_x -Wl,--export=gather_ideal_y -Wl,--export=gather_target
      -Wl,--export=gather_release -Wl,--export=gather_advance -Wl,--export=gather_x -Wl,--export=gather_y
      -Wl,--export=gather_moving -Wl,--export=gather_cancel -Wl,--export=gather_phase
      -Wl,--export=gather_count -Wl,--export=gather_radius
      -o "${terrorized_wasm}"
    DEPENDS core.cpp core.hpp gather.cpp gather.hpp wasm.cpp CMakeLists.txt VERBATIM)
  add_custom_target(d2smm-terrorized-wasm DEPENDS "${terrorized_wasm}")
endif()
