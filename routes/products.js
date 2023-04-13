import { Router } from 'express'
import authMiddleware from '../middleware/auth.js'
import userMiddleware from '../middleware/user.js'
import Product from '../models/Product.js'
import { Telegraf } from "telegraf";

const token = "6264553061:AAFRGFyqBdCK-RKjE2Xw-ENhctFfOQXZKp0";

const bot = new Telegraf(token, {
	telegram: {
		agent: null,
		webhookReply: true,
		timeout: 5000 // set the timeout to 5 seconds
	}
});

const users = [2098458081]

bot.start((ctx) => {
	const chatid = ctx.chat.id;
	users.push(chatid);

	const message = `Salom ${ctx.chat.first_name} bu botdan siz buyurtmalarni qabul qilib olasiz`;

	ctx.telegram.sendMessage(chatid, message).catch((err) => {
		console.log("Error sending message:", err);
	});
})

bot.launch();

const router = Router()

router.get('/', async (req, res) => {
	const products = await Product.find().lean()

	res.render('index', {
		title: 'Buyurtma',
		products: products.reverse(),
		userId: req.userId ? req.userId.toString() : null,
	})
})

router.get('/products', async (req, res) => {
	const user = req.userId ? req.userId.toString() : null
	const myProducts = await Product.find({ user }).populate('user').lean()

	res.render('products', {
		title: 'Mahsulotlar',
		isProducts: true,
		myProducts: myProducts,
	})

})

router.get('/add', authMiddleware, (req, res) => {
	res.render('add', {
		title: "Qo'shish",
		isAdd: true,
		errorAddProducts: req.flash('errorAddProducts'),
	})
})

router.get('/product/:id', async (req, res) => {
	const id = req.params.id
	const product = await Product.findById(id).populate('user').lean()

	res.render('product', {
		product: product,
	})
})

router.get('/edit-product/:id', async (req, res) => {
	const id = req.params.id
	const product = await Product.findById(id).populate('user').lean()

	res.render('edit-product', {
		product: product,
		errorEditProduct: req.flash('errorEditProduct'),
	})
})

router.post('/add-products', userMiddleware, async (req, res) => {
	const { title, description, image, price } = req.body
	if (!title || !description || !image || !price) {
		req.flash('errorAddProducts', 'All fields is required')
		res.redirect('/add')
		return
	}

	await Product.create({ ...req.body, user: req.userId })
	res.redirect('/')
})

router.post("/products/:id", async (req, res) => {
	const id = req.params.id
	const product = await Product.findById(id);

	const currentDate = new Date();
	const dateString = currentDate.toLocaleDateString();
	const timeString = currentDate.toLocaleTimeString();
	const dateTimeString = `${dateString} ${timeString}`;

	const message = `
		Yangi Buyurtma \nNomi: ${product.title} \nMahsulot haqida: ${product.description} \nNarxi: ${product.price} sum \nVaqti: ${dateTimeString}
	`
	for (let chatid of users) {
		bot.telegram.sendMessage(chatid, message)
	}

	const user = req.userId ? req.userId.toString() : null
	const myProducts = await Product.find({ user }).populate('user').lean()

	res.render('products', {
		title: 'Mahsulotlar',
		isProducts: true,
		myProducts: myProducts,
		message: "Buyurtma yuborildi"
	})
})

router.post('/edit-product/:id', async (req, res) => {
	const { title, description, image, price } = req.body
	const id = req.params.id
	if (!title || !description || !image || !price) {
		req.flash('errorEditProduct', 'All fields is required')
		res.redirect(`/edit-product/${id}`)
		return
	}

	await Product.findByIdAndUpdate(id, req.body, { new: true })
	res.redirect('/products')
})

router.post('/delete-product/:id', async (req, res) => {
	const id = req.params.id


	await Product.findByIdAndRemove(id)
	res.redirect('/')
})

export default router
