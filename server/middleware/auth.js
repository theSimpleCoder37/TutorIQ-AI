const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
    const token = req.cookies.token;

    if (!token) {
        return res.status(401).json({ error: 'Access denied. Please login.' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret-key');
        req.user = decoded;
        next();
    } catch (error) {
        res.clearCookie('token');
        res.status(401).json({ error: 'Invalid token. Please login again.' });
    }
};

module.exports = authMiddleware;
