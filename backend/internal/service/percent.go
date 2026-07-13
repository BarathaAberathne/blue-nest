package service

import "math"

// percent returns part/whole as a whole-number percentage using round-half-up
// (0 when whole is 0). One shared rule so every rate the API reports — child
// attendance, occupancy, staff attendance, per-branch — rounds identically.
func percent(part, whole int) int {
	if whole == 0 {
		return 0
	}
	return int(math.Round(float64(part) / float64(whole) * 100))
}
