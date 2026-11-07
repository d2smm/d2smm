#pragma once

namespace d2smm::qol {
class Zoom {
 public:
  void configure(bool enabled);
  bool wheel(double delta, unsigned mode, double height, unsigned context);
  double scale(double nativeScale) const;
  double halfExtent(double pixels, double nativeScale) const;
  double distance() const { return distance_; }

 private:
  bool enabled_ = false;
  double distance_ = 1;
};
}
