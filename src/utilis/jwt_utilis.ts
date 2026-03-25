import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key';

export const generateToken=(userId:string, role: string)=>{
    return jwt.sign({id:userId, role},JWT_SECRET,{ expiresIn: '7d' });
    
}

export const verifyToken=(token:string)=>{
    return jwt.verify(token,JWT_SECRET);
}