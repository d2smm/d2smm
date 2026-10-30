add_library(d2smm-loot-core STATIC loot.cpp)
target_include_directories(d2smm-loot-core PUBLIC "${CMAKE_CURRENT_SOURCE_DIR}")
add_executable(d2smm-loot-checks "${PROJECT_SOURCE_DIR}/tests/loot-core.cpp")
target_link_libraries(d2smm-loot-checks PRIVATE d2smm-loot-core)
add_test(NAME loot-policy COMMAND d2smm-loot-checks)
add_test(NAME loot-version COMMAND d2smm-loot-checks --version)
set_tests_properties(loot-version PROPERTIES TIMEOUT 5 PASS_REGULAR_EXPRESSION "d2smm-loot-checks 1.0.0")
if(D2SMM_WASM_CXX)
  set(loot_wasm "${PROJECT_BINARY_DIR}/generated/loot.wasm")
  add_custom_command(OUTPUT "${loot_wasm}"
    COMMAND "${CMAKE_COMMAND}" -E make_directory "${PROJECT_BINARY_DIR}/generated"
    COMMAND "${D2SMM_WASM_CXX}" --target=wasm32 -std=c++20 -O2 -nostdlib -ffreestanding -fno-exceptions -fno-rtti -mbulk-memory
      "${CMAKE_CURRENT_SOURCE_DIR}/loot.cpp" "${CMAKE_CURRENT_SOURCE_DIR}/wasm.cpp"
      -Wl,--no-entry -Wl,--strip-all
      -Wl,--export=loot_input -Wl,--export=loot_base -Wl,--export=loot_begin -Wl,--export=loot_rule
      -Wl,--export=loot_rarity -Wl,--export=loot_number -Wl,--export=loot_text -Wl,--export=loot_group
      -Wl,--export=loot_end -Wl,--export=loot_commit -Wl,--export=loot_item -Wl,--export=loot_field
      -Wl,--export=loot_modifier -Wl,--export=loot_evaluate -Wl,--export=loot_match -Wl,--export=loot_error
      -o "${loot_wasm}"
    DEPENDS loot.cpp loot.hpp wasm.cpp CMakeLists.txt VERBATIM)
  add_custom_target(d2smm-loot-wasm DEPENDS "${loot_wasm}")
endif()
