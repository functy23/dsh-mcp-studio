/**
 * Bridge: `dsh-tauri-ui/client` → vendored component sources.
 *
 * The upstream barrel also boots its own plugin (settings sections, model config,
 * IM panel, …); pulling that in would drag unrelated features into this package, so
 * only the components the panel uses are re-exported here.
 */

export { Button } from '../vendor/dsh-tauri-ui/client/components/button'
export { Checkbox } from '../vendor/dsh-tauri-ui/client/components/checkbox'
export { Chip } from '../vendor/dsh-tauri-ui/client/components/chip'
export { StateDot } from '../vendor/dsh-tauri-ui/client/components/official'
export { Icon } from '../vendor/dsh-tauri-ui/client/components/icon'
export { IconButton } from '../vendor/dsh-tauri-ui/client/components/icon-button'
export { Tag } from '../vendor/dsh-tauri-ui/client/components/tag'
export {
  ArrowRotateRight,
  ChevronDown,
  GraduationCap,
  LogoGithub,
  PlugConnection,
  Puzzle,
} from '../vendor/dsh-tauri-ui/client/components/icons'
export { Input, Menu, Modal, Pill, Switch } from '../vendor/dsh-tauri-ui/client/components/official'
export { PanelPage } from '../vendor/dsh-tauri-ui/client/ui/panel-page'
export { SegmentedControl } from '../vendor/dsh-tauri-ui/client/ui/segmented-control'
export { cssr } from '../vendor/dsh-tauri-ui/client/utils/cssr'
export { mountStyle } from '../vendor/dsh-tauri-ui/client/utils/style'
export { styles } from '../vendor/dsh-tauri-ui/client/constants/theme'
