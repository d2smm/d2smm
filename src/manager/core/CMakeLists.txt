add_library(d2smm-badges-core STATIC "${CMAKE_CURRENT_SOURCE_DIR}/badges.cpp")
target_include_directories(d2smm-badges-core PUBLIC "${CMAKE_CURRENT_SOURCE_DIR}")
add_executable(d2smm-qol-checks "${PROJECT_SOURCE_DIR}/tests/qol-core.cpp")
target_link_libraries(d2smm-qol-checks PRIVATE d2smm-qol-core d2smm-badges-core)
add_test(NAME qol-policy COMMAND d2smm-qol-checks)
add_test(NAME qol-version COMMAND d2smm-qol-checks --version)
set_tests_properties(qol-version PROPERTIES TIMEOUT 5 PASS_REGULAR_EXPRESSION "d2smm-qol-checks 1.0.0")
add_library(d2smm-perfection-core STATIC "${PROJECT_SOURCE_DIR}/mods/characters/core/perfection.cpp")
target_include_directories(d2smm-perfection-core PUBLIC "${PROJECT_SOURCE_DIR}/mods/characters/core")
add_executable(d2smm-perfection-checks "${PROJECT_SOURCE_DIR}/tests/perfection-core.cpp")
target_link_libraries(d2smm-perfection-checks PRIVATE d2smm-perfection-core)
add_test(NAME perfection-policy COMMAND d2smm-perfection-checks)
add_test(NAME perfection-version COMMAND d2smm-perfection-checks --version)
set_tests_properties(perfection-version PROPERTIES TIMEOUT 5 PASS_REGULAR_EXPRESSION "d2smm-perfection-checks 1.0.0")
if(D2SMM_WASM_CXX)
  get_target_property(qol_sources d2smm-qol-core SOURCES)
  get_target_property(qol_includes d2smm-qol-core INTERFACE_INCLUDE_DIRECTORIES)
  set(manager_wasm "${PROJECT_BINARY_DIR}/generated/manager.wasm")
  add_custom_command(OUTPUT "${manager_wasm}"
    COMMAND "${CMAKE_COMMAND}" -E make_directory "${PROJECT_BINARY_DIR}/generated"
    COMMAND "${D2SMM_WASM_CXX}" --target=wasm32 -std=c++20 -O2 -nostdlib -fno-exceptions -fno-rtti -mbulk-memory
      -I "${qol_includes}" -I "${PROJECT_SOURCE_DIR}/mods/characters/core" "${CMAKE_CURRENT_SOURCE_DIR}/badges.cpp" "${CMAKE_CURRENT_SOURCE_DIR}/wasm.cpp" "${PROJECT_SOURCE_DIR}/mods/characters/core/perfection.cpp" ${qol_sources}
      -Wl,--no-entry -Wl,--strip-all
      -Wl,--export=d2smm_badge_input -Wl,--export=d2smm_badge_length -Wl,--export=d2smm_badge_valid_key
      -Wl,--export=d2smm_badge_reset -Wl,--export=d2smm_badge_apply -Wl,--export=d2smm_badge_count -Wl,--export=d2smm_badge_key
      -Wl,--export=d2smm_qol_candidate -Wl,--export=d2smm_qol_admit -Wl,--export=d2smm_qol_transferred
      -Wl,--export=d2smm_qol_combat_configure -Wl,--export=d2smm_qol_query_mode -Wl,--export=d2smm_qol_tint_reset -Wl,--export=d2smm_qol_tint_open -Wl,--export=d2smm_qol_tint -Wl,--export=d2smm_qol_tint_release
      -Wl,--export=d2smm_qol_effect_visible
      -Wl,--export=d2smm_stash_validate -Wl,--export=d2smm_stash_has_items -Wl,--export=d2smm_stash_configure -Wl,--export=d2smm_stash_selected
      -Wl,--export=d2smm_stash_prefix -Wl,--export=d2smm_stash_code -Wl,--export=d2smm_stash_left -Wl,--export=d2smm_stash_width
      -Wl,--export=d2smm_stash_import_begin -Wl,--export=d2smm_stash_import_current -Wl,--export=d2smm_stash_import_finish -Wl,--export=d2smm_stash_import_cancel
      -Wl,--export=d2smm_manager_configure -Wl,--export=d2smm_manager_enabled -Wl,--export=d2smm_manager_next_enabled -Wl,--export=d2smm_manager_feature
      -Wl,--export=d2smm_qol_effect_profile -Wl,--export=d2smm_qol_effect_begin -Wl,--export=d2smm_qol_effect_part -Wl,--export=d2smm_qol_effect_end
      -Wl,--export=d2smm_perfection_begin -Wl,--export=d2smm_perfection_property -Wl,--export=d2smm_perfection_input -Wl,--export=d2smm_perfection_member -Wl,--export=d2smm_perfection_end -Wl,--export=d2smm_perfection_finish -Wl,--export=d2smm_perfection_rolls
      -Wl,--export=d2smm_perfection_observe -Wl,--export=d2smm_perfection_armor -Wl,--export=d2smm_perfection_value
      -o "${manager_wasm}"
    DEPENDS badges.cpp badges.hpp controls.hpp wasm.cpp CMakeLists.txt ${qol_sources} "${qol_includes}/qol.hpp" "${qol_includes}/combat.hpp" "${qol_includes}/stash.hpp" "${PROJECT_SOURCE_DIR}/mods/characters/core/perfection.cpp" "${PROJECT_SOURCE_DIR}/mods/characters/core/perfection.hpp" VERBATIM)
  add_custom_target(d2smm-manager-wasm DEPENDS "${manager_wasm}")
endif()
add_library(d2smm-manager-controls INTERFACE)
target_include_directories(d2smm-manager-controls INTERFACE "${CMAKE_CURRENT_SOURCE_DIR}")
add_executable(d2smm-manager-controls-checks "${PROJECT_SOURCE_DIR}/tests/manager-controls.cpp")
target_link_libraries(d2smm-manager-controls-checks PRIVATE d2smm-manager-controls)
add_test(NAME manager-controls COMMAND d2smm-manager-controls-checks)
add_test(NAME manager-controls-version COMMAND d2smm-manager-controls-checks --version)
set_tests_properties(manager-controls-version PROPERTIES TIMEOUT 5 PASS_REGULAR_EXPRESSION "d2smm-manager-controls-checks 1.0.0")
