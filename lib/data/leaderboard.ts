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
    id: "luke",
    name: "Luke",
    avatar: "/avatars/luke.jpeg",
    rank: 1,
    maxTemp: 92,
    totalMinutes: 47,
    streak: 5,
  },
  {
    id: "brit",
    name: "Brit",
    avatar: "/avatars/brit.jpeg",
    rank: 2,
    maxTemp: 87,
    totalMinutes: 58,
    streak: 4,
  },
  {
    id: "henry",
    name: "Henry",
    avatar: "/avatars/henry.jpeg",
    rank: 3,
    maxTemp: 94,
    totalMinutes: 52,
    streak: 7,
  },
  {
    id: "antonina",
    name: "Antonina",
    avatar: "/avatars/antonina.jpg",
    rank: 4,
    maxTemp: 85,
    totalMinutes: 44,
    streak: 3,
  },
  {
    id: "vojtech",
    name: "Vojtech",
    avatar: "/avatars/vojtech.jpg",
    rank: 5,
    maxTemp: 89,
    totalMinutes: 50,
    streak: 6,
  },
]


