// Calendar Navigation
const currentWeekStart = new Date(2025, 9, 3) // October 3, 2025

function formatDate(date) {
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ]
  return `${months[date.getMonth()]} ${date.getDate()}`
}

console.log("[v0] Dashboard initialized")
