const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const sanitize = require('mongo-sanitize');
const bodyParser = require('body-parser');
const session = require('express-session');
const passport = require('passport');
const cookieParser = require('cookie-parser');
require('./db');

const Answer = mongoose.model('Answer');
const Question = mongoose.model('Question');
const Course = mongoose.model('Course');
const Student = mongoose.model('Student');

class MyCourse{
	constructor(name, code){
		this.name = name;
		this.code = code;
	}
	print(){
		console.log('New course saved to database:');
		console.log(this);
	}
}

class MyQuestion{
	constructor(text, name){
		this.text = text;
		this.name = name;
	}
	print(){
		console.log('New question saved to database:');
		console.log(this);
	}
}

class MyAnswer{
	constructor(text, name){
		this.text = text;
		this.name = name;
	}
	print(){
		console.log('New answer saved to database:');
		console.log(this);
	}
}

const app = express();
app.set('view engine', 'hbs');
app.use(express.static(path.join(__dirname, '/public')));
app.use(express.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cookieParser());
app.use(session({
	secret: 'keyboard cat',
	resave: false,
	saveUninitialized: true,
	cookie: { secure: true }
	}));
app.use(passport.initialize());
app.use(passport.session());

require('./models/Users');
require('./config/passport');

let URL='';

if(process.env.NODE_ENV === 'PRODUCTION'){
	URL = `http://linserv1.cims.nyu.edu:${process.env.PORT}`;
}
else{
	URL = `http://localhost:${process.env.PORT}`;
}

app.use(require('./routes'));

app.get('/home/add-course', (req,res)=>{
	res.render('enroll', {'URL':URL});
});

app.get('/', (req, res)=>{
	res.render('login', {'URL':URL});
});

app.get('/signup', (req, res)=>{
	res.render('signup', {'URL':URL});
});

app.get('/home', (req, res)=>{
	if(req.cookies.id){
		const username = sanitize(req.cookies.username);
		const studentobj = {'NetID':username};
		Student.
		findOne(studentobj).
		populate('courses').
		exec((err,results)=>{
			const courses = results.courses;
			res.render('home', {'URL':URL, 'courses':courses});
		});
		
	}
	else{
		res.send('Not Logged In!');
	}
});

app.post('/home', (req, res)=>{
	const courseCode = sanitize(req.body.courseCode).toLowerCase();
	const courseName = sanitize(req.body.courseName).toLowerCase();
	const myCourse = new MyCourse(courseName, courseCode);
	const course = new Course(myCourse);

	// if it's a new course, add it to the database
	Course.find(myCourse, (err,result)=>{
		if(!result || result===undefined || result.length===0){
			course.save((err, doc)=>{
				if(err){
					console.log('Cannot enroll due to Database Error!');
					console.log(err);
					const username = req.cookies.username;
					const studentobj = {'NetID':username};
					Student.
						findOne(studentobj).
						populate('courses').
						exec((err,results)=>{
							const courses = results.courses;
							res.render('home', {'URL':URL, 'courses':courses});
						});
				}
				else{
					myCourse.print();
					// add this course to student's course list
					const username = req.cookies.username;
					const studentobj = {'NetID':username};
					Student.findOneAndUpdate(studentobj, { $addToSet: {courses: doc._id}}, function(){
						Student.
						findOne(studentobj).
						populate('courses').
						exec((err,results)=>{
							const courses = results.courses;
							res.render('home', {'URL':URL, 'courses':courses});
						});
					});
					console.log('Successfully enrolled!');
				}
			});
		}
		else{
			// add this course to student's course list
			const username = req.cookies.username;
			const studentobj = {'NetID':username};
			Student.findOneAndUpdate(studentobj, { $addToSet: {courses: result[0]._id}}, function(){
				Student.
				findOne(studentobj).
				populate('courses').
				exec((err,results)=>{
					const courses = results.courses;
					res.render('home', {'URL':URL, 'courses':courses});
				});
			});
		}
	});
});

app.get('/home/:slug', (req, res)=>{
	if(req.cookies.id){
		const slug = sanitize(req.params.slug);
		const obj = {'slug':slug};
		Course.
		findOne(obj).
		populate('questions').
		exec((err, course)=>{
			if(err || course===null || course.length===0){
				res.status(404);
				res.send('Error!!');
			}
			else{
				res.render('course', {'URL':URL, 'course':course});
			}
		});
	}
	else{
		res.send('Not Logged In!');
	}
	
});

app.post('/home/:slug', (req, res)=>{
	const slug = sanitize(req.params.slug);
	const text = sanitize(req.body.text);
	const name = sanitize(req.body.name);
	const obj = {'slug':slug};

	const myQuestion = new MyQuestion(text,name);
	const newQuestion = new Question(myQuestion);
	newQuestion.save((err, doc)=>{
		Course.findOneAndUpdate(obj, { $addToSet: {questions:doc._id}}, function(){
			myQuestion.print();
			res.redirect(`/home/${slug}`);
		});
	});
});

app.get('/home/:course/:question', (req,res)=>{
	const courseslug = sanitize(req.params.course);
	const question = sanitize(req.params.question);
	const obj = {slug:question};

	Question.
	findOne(obj).
	populate('answers').
	exec((err, questions)=>{
		if(err || questions===null || questions.length===0){
			res.status(404);
			res.send('Error!!');
		}
		else{
			res.render('question', {'question': questions, 'courseslug':courseslug});
		}
	});
});

app.post('/home/:course/:question', (req,res)=>{
	const courseslug = sanitize(req.params.course);
	const question = sanitize(req.params.question);
	const obj = {slug:question};
	const answerText = sanitize(req.body.text);
	const answerName = sanitize(req.body.name);

	const myAnswer = new MyAnswer(answerText,answerName);
	const newAnswer = new Answer(myAnswer);
	newAnswer.save((err, doc)=>{
		Question.findOneAndUpdate(obj, { $addToSet: {answers:doc._id}}, function(){
			myAnswer.print();
			res.redirect(`/home/${courseslug}/${question}`);
		});
	});
});

app.listen(process.env.PORT||3000);