#include "zoom.hpp"

namespace d2smm::qol {
void Zoom::configure(bool enabled) {
  enabled_ = enabled;
  if (!enabled) distance_ = 1;
}

bool Zoom::wheel(double delta, unsigned mode, double height, unsigned context) {
  // Game canvas, camp/play, no modifiers, and no foreground game panel.
  if (!enabled_ || context != 15 || !__builtin_isfinite(delta) || delta == 0 || mode > 2)
    return false;
  if (mode == 1) delta *= 16;
  if (mode == 2) {
    if (!__builtin_isfinite(height) || height <= 0) return false;
    delta *= height;
  }
  if (delta > 240) delta = 240;
  if (delta < -240) delta = -240;
  distance_ += delta * 0.0025;
  if (distance_ < 1) distance_ = 1;
  if (distance_ > 4) distance_ = 4;
  return true;
}

double Zoom::scale(double nativeScale) const {
  return nativeScale / distance_;
}

double Zoom::halfExtent(double pixels, double nativeScale) const {
  return pixels / (2 * scale(nativeScale));
}
}
