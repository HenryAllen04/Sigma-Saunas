export type LeaderboardUser = {
  id: string
  name: string
  avatar: string
  rank: number
  maxTemp: number
  totalMinutes: number
  streak: number
}

export const leaderboard: LeaderboardUser[] = [
  {
    id: "henry",
    name: "Henry",
    avatar: "/avatars/henry.png",
    rank: 1,
    maxTemp: 94,
    totalMinutes: 52,
    streak: 7,
  },
  {
    id: "vojtech",
    name: "Vojtech",
    avatar: "/avatars/vojtech.png",
    rank: 2,
    maxTemp: 89,
    totalMinutes: 50,
    streak: 6,
  },
  {
    id: "luke",
    name: "Luke",
    avatar: "/avatars/luke.png",
    rank: 3,
    maxTemp: 92,
    totalMinutes: 47,
    streak: 5,
  },
  {
    id: "brit",
    name: "Brit",
    avatar: "/avatars/brit.png",
    rank: 4,
    maxTemp: 87,
    totalMinutes: 58,
    streak: 4,
  },
  {
    id: "antonina",
    name: "Antonina",
    avatar: "/avatars/antonina.png",
    rank: 5,
    maxTemp: 85,
    totalMinutes: 44,
    streak: 3,
  },
]


