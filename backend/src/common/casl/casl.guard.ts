import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { AbilityFactory, Actions, Subjects } from './ability.factory'
import { CHECK_POLICIES_KEY, CHECK_POLICY_KEY, RequiredRule } from './casl.decorator'

@Injectable()
export class CaslGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private abilityFactory: AbilityFactory,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const policies = this.reflector.getAllAndOverride<RequiredRule[]>(CHECK_POLICIES_KEY, [
      context.getHandler(),
      context.getClass(),
    ])

    const policy = this.reflector.getAllAndOverride<RequiredRule>(CHECK_POLICY_KEY, [
      context.getHandler(),
      context.getClass(),
    ])

    if (!policies && !policy) {
      return true
    }

    const request = context.switchToHttp().getRequest()
    const user = request.user

    if (!user) {
      throw new ForbiddenException('User not authenticated')
    }

    const ability = this.abilityFactory.createForUser(user)

    if (policy) {
      return this.checkPolicy(ability, policy, request)
    }

    if (policies) {
      return policies.every(policy => this.checkPolicy(ability, policy, request))
    }

    return true
  }

  private checkPolicy(ability: any, policy: RequiredRule, request: any): boolean {
    const { action, subject, conditions } = policy

    // Handle dynamic conditions based on request context
    let finalConditions = conditions
    if (conditions && typeof conditions === 'object') {
      finalConditions = this.resolveConditions(conditions, request)
    }

    if (finalConditions) {
      return ability.can(action, subject, finalConditions)
    }

    return ability.can(action, subject)
  }

  private resolveConditions(conditions: Record<string, any>, request: any): Record<string, any> {
    const resolved: Record<string, any> = {}

    for (const [key, value] of Object.entries(conditions)) {
      if (typeof value === 'string' && value.startsWith('$')) {
        // Handle dynamic values like $user.id, $params.id, etc.
        const path = value.substring(1)
        resolved[key] = this.getNestedValue(request, path)
      } else {
        resolved[key] = value
      }
    }

    return resolved
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined
    }, obj)
  }
}
