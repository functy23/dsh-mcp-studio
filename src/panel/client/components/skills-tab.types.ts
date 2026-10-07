import type { Translate } from '../locales/index.types'

export interface SkillEditorState {
  mode: 'edit' | 'view'
  name: string
  description: string
  whenToUse: string
  modelInvocable: boolean
  userInvocable: boolean
  content: string
}

export type OpenTarget = { target: 'user-skills' } | { target: 'skill', name: string } | { target: 'source', source: string }

export interface SkillsTabProps {
  t: Translate
  createSkill: () => Promise<void>
}
