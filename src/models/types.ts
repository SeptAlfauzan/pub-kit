export type StepId = 'icon' | 'shots' | 'mockup' | 'store'

export interface IconSizeEntry {
  key: string
  label: string
  width: number
  height: number
  platform: 'ios' | 'android'
}

export interface IconResult {
  key: string
  blob: Blob
  url: string
}

export interface TargetSize {
  label: string
  width: number
  height: number
  platform: 'ios' | 'android'
}

export type ShotStatus = 'pass' | 'warn' | 'error'

export interface Shot {
  id: string
  name: string
  width: number
  height: number
  file: File
  url: string
  resizedUrl: string
  status: ShotStatus
  statusMessage: string
}

export interface FeatureGraphic {
  file: File
  url: string
  width: number
  height: number
  status: ShotStatus
  statusMessage: string
}

export interface MockupSettings {
  frame: 'phone' | 'tablet' | 'none'
  bg: string
  bgText: string
  bgImage: string | null
  captions: Record<string, string>
}

export interface ProjectState {
  currentStep: StepId
  appName: string
  iconSource: string | null
  iconForeground: string | null
  iconBackground: string | null
  iconResults: IconResult[]
  targetSizeIndex: number
  shots: Shot[]
  featureGraphic: FeatureGraphic | null
  mockupSettings: MockupSettings
  readySteps: Record<StepId, boolean>
}
