import { systemIcons } from './system'
import { toolbarIcons } from './toolbar'


export const icons = {
  ...toolbarIcons,
  ...systemIcons
}

export type IconName = keyof typeof icons
