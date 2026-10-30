add_library(d2smm-badges-core STATIC "${CMAKE_CURRENT_SOURCE_DIR}/badges.cpp")
target_include_directories(d2smm-badges-core PUBLIC "${CMAKE_CURRENT_SOURCE_DIR}")
add_executable(d2smm-qol-checks "${PROJECT_SOURCE_DIR}/tests/qol-core.cpp")
target_link_libraries(d2smm-qol-checks PRIVATE d2smm-qol-core d2smm-badges-core)
add_test(NAME qol-policy COMMAND d2smm-qol-checks)
add_test(NAME qol-version COMMAND d2smm-qol-checks --version)
set_tests_properties(qol-version PROPERTIES TIMEOUT 5 PASS_REGULAR_EXPRESSION "d2smm-qol-checks 1.0.0")
if(D2SMM_WASM_CXX)
  get_target_property(qol_sources d2smm-qol-core SOURCES)
  get_target_property(qol_includes d2smm-qol-core INTERFACE_INCLUDE_DIRECTORIES)
  set(manager_wasm "${PROJECT_BINARY_DIR}/generated/manager.wasm")
  add_custom_command(OUTPUT "${manager_wasm}"
    COMMAND "${CMAKE_COMMAND}" -E make_directory "${PROJECT_BINARY_DIR}/generated"
    COMMAND "${D2SMM_WASM_CXX}" --target=wasm32 -std=c++20 -O2 -nostdlib -fno-exceptions -fno-rtti -mbulk-memory
      -I "${qol_includes}" "${CMAKE_CURRENT_SOURCE_DIR}/badges.cpp" "${CMAKE_CURRENT_SOURCE_DIR}/wasm.cpp" ${qol_sources}
      -Wl,--no-entry -Wl,--strip-all
      -Wl,--export=d2smm_badge_input -Wl,--export=d2smm_badge_length -Wl,--export=d2smm_badge_valid_key
      -Wl,--export=d2smm_badge_reset -Wl,--export=d2smm_badge_apply -Wl,--export=d2smm_badge_count -Wl,--export=d2smm_badge_key
      -Wl,--export=d2smm_qol_candidate -Wl,--export=d2smm_qol_admit -Wl,--export=d2smm_qol_transferred
      -o "${manager_wasm}"
    DEPENDS badges.cpp badges.hpp wasm.cpp CMakeLists.txt ${qol_sources} "${qol_includes}/qol.hpp" VERBATIM)
  add_custom_target(d2smm-manager-wasm DEPENDS "${manager_wasm}")
endif()
