const Campground = require('../models/campground');
const mbxGeocoding = require("@mapbox/mapbox-sdk/services/geocoding");
const mapBoxToken = process.env.MAPBOX_TOKEN;
const geocoder = mbxGeocoding({ accessToken: mapBoxToken });
const { cloudinary } = require("../cloudinary");
const User = require('../models/user');
const stripe = require('stripe')(process.env.STRIPE_KEY)

module.exports.index = async (req, res) => {
    const campgrounds = await Campground.find({}).populate('popupText');
    res.render('campgrounds/index', { campgrounds })
}

module.exports.renderNewForm = (req, res) => {
    res.render('campgrounds/new');
}

module.exports.createCampground = async (req, res, next) => {
    const geoData = await geocoder.forwardGeocode({
        query: req.body.campground.location,
        limit: 1
    }).send()
    const campground = new Campground(req.body.campground);
    const user = await User.findById(req.user._id);

    campground.geometry = geoData.body.features[0].geometry;
    campground.images = req.files.map(f => ({ url: f.path, filename: f.filename }));
    campground.author = req.user._id;
    user.campgrounds.push(campground);
    await campground.save();
    await user.save();
    req.flash('success', 'Successfully made a new campground!');
    res.redirect(`/campgrounds/${campground._id}`)
}

module.exports.showCampground = async (req, res,) => {
    const campground = await Campground.findById(req.params.id).populate({
        path: 'reviews',
        populate: {
            path: 'author'
        }
    }).populate('author');
    if (!campground) {
        req.flash('error', 'Cannot find that campground!');
        return res.redirect('/campgrounds');
    }
    res.render('campgrounds/show', { campground });
}

module.exports.renderLocation = async (req, res) => {
    const agents = await req.query.agent
    const spaces = await req.query.spaces
    const location_search = await req.query.city;
    //if only agents only render agents in that area
    const all_campgrounds = await Campground.find({}).populate('popupText');
    const campgrounds = []
    for (let i = 0; i < all_campgrounds.length; i++) {
        if (all_campgrounds[i].city == location_search) {
            campgrounds.push(all_campgrounds[i])
        }

    }
    if (agents) {
        const all_agents = await User.find({}).populate('popupText');
        const agents = []
        for (let i = 0; i < all_agents.length; i++) {
            for (let y = 0; y < all_agents[i].cities.length; y++) {
                if (all_agents[i].cities[y] == location_search) {
                    agents.push(all_agents[i])
                }
            }
        }

        if (agents.length == 0) {
            req.flash('error', `No Agents Available in ${location_search}`)
            res.redirect('/campgrounds')
        }
        else {
            res.render('users/find_users', { agents, location_search, campgrounds })
        }

    }
    else {
        if (campgrounds.length == 0) {
            req.flash('error', `No Spaces Available in ${location_search}`)
            res.redirect('/campgrounds')
        }
        else {
            res.render('campgrounds/find_spaces', { campgrounds })
        }
    }


    // const campgrounds = await Campground.find({}).populate('popupText');
    // res.render('campgrounds/find', { location }, { campgrounds })
}

module.exports.checkout = async (req, res) => {
    const buyer = await User.findById(req.user.id)
    const { id } = req.params;
    const campground = await Campground.findById(id)
    const auth_id = campground.author
    const auth = await User.findById(auth_id)
    // const paymentIntent = await stripe.paymentIntents.create({
    //     payment_method_types: ['card'],
    //     amount: campground.price * 100,
    //     currency: 'mxn',
    //     application_fee_amount: campground.price * 2.5,
    //     on_behalf_of: buyer.stripe_account,
    //     transfer_data: {
    //         destination: auth.stripe_account,
    //     }
    // });

    const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        payment_intent_data: {
            application_fee_amount: campground.price * 2.5,
            receipt_email: buyer.email,
            transfer_data: {
                destination: auth.stripe_account
            }

        },
        line_items: [{
            amount: campground.price * 100 + campground.price * 2.5,
            name: campground.title,
            currency: 'mxn',
            quantity: 1,
        }],
        mode: 'payment',
        success_url: 'https://agile-peak-48325.herokuapp.com/campgrounds',
        cancel_url: 'https://agile-peak-48325.herokuapp.com/campgrounds',
    });
    res.redirect(session.url)
}

module.exports.renderEditForm = async (req, res) => {
    const { id } = req.params;
    const campground = await Campground.findById(id)
    if (!campground) {
        req.flash('error', 'Cannot find that space!');
        return res.redirect('/campgrounds');
    }
    res.render('campgrounds/edit', { campground });
}

module.exports.updateCampground = async (req, res) => {

    const { id } = req.params;
    const campground = await Campground.findByIdAndUpdate(id, { ...req.body.campground });
    const imgs = req.files.map(f => ({ url: f.path, filename: f.filename }));
    campground.images.push(...imgs);
    await campground.save();
    if (req.body.deleteImages) {
        for (let filename of req.body.deleteImages) {
            await cloudinary.uploader.destroy(filename);
        }
        await campground.updateOne({ $pull: { images: { filename: { $in: req.body.deleteImages } } } })
    }
    req.flash('success', 'Successfully updated space!');
    res.redirect(`/campgrounds/${campground._id}`)
}

module.exports.deleteCampground = async (req, res) => {
    const { id } = req.params;
    await Campground.findByIdAndDelete(id);
    req.flash('success', 'Successfully deleted space')
    res.redirect('/campgrounds');
}