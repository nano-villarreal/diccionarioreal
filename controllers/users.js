const User = require('../models/user');
const Campground = require('../models/campground');
// Set your secret key. Remember to switch to your live secret key in production.
// See your keys here: https://dashboard.stripe.com/apikeys
const stripe = require('stripe')(process.env.STRIPE_KEY);



module.exports.renderRegister = (req, res) => {
    res.render('users/register');
}

module.exports.register = async (req, res, next) => {
    const account = await stripe.accounts.create({ type: 'express' });
    const accountLink = await stripe.accountLinks.create({
        account: account.id,
        refresh_url: 'https://agile-peak-48325.herokuapp.com/campgrounds',
        return_url: 'https://agile-peak-48325.herokuapp.com/campgrounds',
        type: 'account_onboarding',
    });
    try {
        const { email, website, phone, username, password, name } = req.body;
        var cities = req.body.cities.split(",");
        for (let i = 0; i < cities.length; i++) {
            cities[i] = cities[i].trim()
        }
        const user = new User({ email, username, cities, website, phone, name });
        user.stripe_account = account.id
        console.log(user)
        const registeredUser = await User.register(user, password);
        req.login(registeredUser, err => {
            if (err) return next(err);
            req.flash('success', 'Welcome to Squr!');
            res.redirect(accountLink.url);
        })
    } catch (e) {
        req.flash('error', e.message);
        res.redirect(accountLink.url);
    }

}

module.exports.renderLogin = (req, res) => {
    res.render('users/login');
}

module.exports.login = (req, res) => {
    req.flash('success', 'welcome back!');
    const redirectUrl = req.session.returnTo || '/campgrounds';
    delete req.session.returnTo;
    res.redirect(redirectUrl);
}

module.exports.logout = (req, res) => {
    req.logout();
    // req.session.destroy();
    req.flash('success', "Goodbye!");
    res.redirect('/campgrounds');
}


module.exports.createStripe = async (req, res) => {
    const account = await stripe.accounts.create({ type: 'express' });

}

module.exports.showUserSpace = async (req, res) => {
    const user = await User.findById(req.params.id).populate({
        path: 'reviews',
        populate: {
            path: 'campgrounds'
        }
    }).populate('campgrounds')
    const campgrounds = user.campgrounds
    res.render('users/show', { user, campgrounds })
}

module.exports.findCitySpaces = async (req, res) => {
    // console.log(JSON.stringify(req.query))
    // console.log(req.query.Monterrey)
    const user = await User.findById(req.params.id).populate({
        path: 'reviews',
        populate: {
            path: 'campgrounds'
        }
    }).populate('campgrounds');
    const all_campgrounds = await Campground.find({}).populate('popupText');
    const desired_cities = []
    const campgrounds = []
    for (let key of Object.keys(req.query)) {
        if (user.cities.includes(key)) {
            desired_cities.push(key)
        }
    }
    for (let i = 0; i < user.campgrounds.length; i++) {
        console.log(user.campgrounds[i].city)
        if (desired_cities.includes(user.campgrounds[i].city)) {
            campgrounds.push(user.campgrounds[i])
        }

    }
    res.render('users/show_cities', { campgrounds, desired_cities, user })
}