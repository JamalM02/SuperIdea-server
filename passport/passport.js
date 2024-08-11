const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/model.User');
const passport = require('passport');

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.NODE_ENV === 'production'
        ? process.env.GOOGLE_CALLBACK_URL_PROD
        : 'http://localhost:5000/api/users/auth/google/callback'
}, async (accessToken, refreshToken, profile, done) => {
    try {
        let user = await User.findOne({ googleId: profile.id });
        if (!user) {
            user = await User.create({
                googleId: profile.id,
                email: profile.emails[0].value,
                fullName: profile.displayName,
                type: 'Student', // or derive this from profile if available
            });
        }
        done(null, user);
    } catch (err) {
        done(err, false, err.message);
    }
}));

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (err) {
        done(err, false, err.message);
    }
});

module.exports = passport;
