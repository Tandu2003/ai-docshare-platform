import { SetMetadata } from '@nestjs/common'
import { Actions, Subjects } from './ability.factory'

export interface RequiredRule {
  action: Actions
  subject: Subjects
  conditions?: Record<string, any>
}

export const CHECK_POLICIES_KEY = 'check_policy'
export const CheckPolicies = (...requirements: RequiredRule[]) =>
  SetMetadata(CHECK_POLICIES_KEY, requirements)

export const CHECK_POLICY_KEY = 'check_policy'
export const CheckPolicy = (requirement: RequiredRule) =>
  SetMetadata(CHECK_POLICY_KEY, requirement)
