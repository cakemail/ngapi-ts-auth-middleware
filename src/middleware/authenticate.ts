import { DecodedToken } from '../types'
import { JwtService } from '../services/jwt.service'

export async function authenticate(token: string, jwtService: JwtService): Promise<DecodedToken> {
    return await jwtService.verify(token)
}
