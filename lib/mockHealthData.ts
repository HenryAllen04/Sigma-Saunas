export interface HealthData {
  heartRate: number
  hrv: number
  timestamp: Date
  bodyTemperature?: number
  activeCalories?: number
}

export const mockHealthData: HealthData[] = [
  {
    heartRate: 72,
    hrv: 55,
    timestamp: new Date(),
    bodyTemperature: 37.0,
    activeCalories: 120,
  },
  {
    heartRate: 85,
    hrv: 48,
    timestamp: new Date(Date.now() - 60000),
    bodyTemperature: 37.2,
    activeCalories: 145,
  },
  {
    heartRate: 95,
    hrv: 42,
    timestamp: new Date(Date.now() - 120000),
    bodyTemperature: 37.5,
    activeCalories: 168,
  },
]

export const getCurrentHealthData = (): HealthData => {
  return mockHealthData[0]
}

export const getHealthDataStream = (
  callback: (data: HealthData) => void,
  interval: number = 5000
) => {
  let index = 0
  const streamInterval = setInterval(() => {
    const baseData = mockHealthData[index % mockHealthData.length]
    const variance = (Math.random() - 0.5) * 10

    const data: HealthData = {
      heartRate: Math.round(baseData.heartRate + variance),
      hrv: Math.round(baseData.hrv + (Math.random() - 0.5) * 5),
      bodyTemperature: parseFloat((baseData.bodyTemperature! + (Math.random() - 0.5) * 0.3).toFixed(1)),
      activeCalories: baseData.activeCalories! + index * 5,
      timestamp: new Date(),
    }

    callback(data)
    index++
  }, interval)

  return () => clearInterval(streamInterval)
}
