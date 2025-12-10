import jwt from 'jsonwebtoken'
import { DecodedToken, JwtOptions } from '../types'
import { AuthenticationError } from '../errors'

export class JwtService {
    private readonly publicKey: string | Buffer
    private readonly options: jwt.VerifyOptions

    constructor(publicKey: string | Buffer, jwtOptions?: JwtOptions) {
        this.publicKey = publicKey
        this.options = {
            algorithms: (jwtOptions?.algorithms as jwt.Algorithm[]) || ['RS256'],
            issuer: jwtOptions?.issuer || 'urn:cakemail',
            clockTolerance: jwtOptions?.clockTolerance || 10,
        }
    }

    async verify(token: string): Promise<DecodedToken> {
        return Promise.resolve()
            .then(() => jwt.verify(token, this.publicKey, this.options) as DecodedToken)
            .catch((error: unknown) => {
                if (error instanceof jwt.TokenExpiredError) {
                    throw new AuthenticationError('Token has expired')
                }
                if (error instanceof jwt.JsonWebTokenError) {
                    throw new AuthenticationError('Invalid token')
                }
                throw new AuthenticationError('Token verification failed')
            })
    }
}
