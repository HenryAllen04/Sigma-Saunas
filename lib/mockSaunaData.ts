export interface SaunaData {
  temperature: number
  humidity: number
  presence: boolean
  timestamp: Date
  sessionDuration?: number
}

export const mockSaunaData: SaunaData[] = [
  {
    temperature: 75,
    humidity: 12,
    presence: true,
    timestamp: new Date(),
    sessionDuration: 0,
  },
  {
    temperature: 78,
    humidity: 14,
    presence: true,
    timestamp: new Date(Date.now() - 60000),
    sessionDuration: 1,
  },
  {
    temperature: 82,
    humidity: 16,
    presence: true,
    timestamp: new Date(Date.now() - 120000),
    sessionDuration: 2,
  },
]

export const getCurrentSaunaData = (): SaunaData => {
  return mockSaunaData[0]
}

export const getSaunaDataStream = (
  callback: (data: SaunaData) => void,
  interval: number = 5000
) => {
  let index = 0
  const streamInterval = setInterval(() => {
    const baseData = mockSaunaData[index % mockSaunaData.length]
    const tempVariance = (Math.random() - 0.5) * 3
    const humidityVariance = (Math.random() - 0.5) * 2

    const data: SaunaData = {
      temperature: Math.round(baseData.temperature + tempVariance),
      humidity: Math.round(baseData.humidity + humidityVariance),
      presence: true,
      sessionDuration: index,
      timestamp: new Date(),
    }

    callback(data)
    index++
  }, interval)

  return () => clearInterval(streamInterval)
}
