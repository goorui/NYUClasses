const mongoose = require('mongoose');
const passport = require('passport');
const router = require('express').Router();
const sanitize = require('mongo-sanitize');
const auth = require('../auth');
const Users = mongoose.model('Users');
const Student = mongoose.model('Student');

class MyStudent{
  constructor(name, NetID){
    this.name=name;
    this.NetID=NetID;
  }
  print(){
    console.log('New Student saved to database:');
    console.log(this);
  }
}

//POST new user route (optional, everyone has access)
router.post('/', auth.optional, (req, res) => {
  const username = sanitize(req.body.username);
  const password = sanitize(req.body.password);
  const realname = sanitize(req.body.realname);
  const user = {username:username, password:password};
  const myStudent = new MyStudent(realname, username);
  myStudent.print();
  
  const student = new Student(myStudent);
  student.save((err)=>{
    if(err){
      console.log(err);
    }
  });

  if(!user.username) {
    return res.status(422).json({
      errors: {
        username: 'is required',
      },
    });
  }

  if(!user.password) {
    return res.status(422).json({
      errors: {
        password: 'is required',
      },
    });
  }

  const finalUser = new Users(user);

  finalUser.setPassword(user.password);

  finalUser.save(()=>{
    res.redirect('../../../');
  });
});

//POST login route (optional, everyone has access)
router.post('/login', (req, res, next) => {
  const username = sanitize(req.body.username);
  const password = sanitize(req.body.password);
  const user = {username:username, password:password};

  // basic validation:
  if(!user.username) {
    return res.status(422).json({
      errors: {username: 'is required'}
    });
  }

  if(!user.password) {
    return res.status(422).json({
      errors: {password: 'is required'}
    });
  }

  return passport.authenticate('local', (err, passportUser) => {
    if(err) {
      return next(err);
    }

    if(passportUser) {
      req.login(passportUser, (err)=>{
        if(err){
          res.send('Error!');
        }
        else{
          passport.serializeUser(passportUser, ()=>{
            res.cookie('id', req.sessionID);
            res.cookie('username', passportUser.username);
            res.redirect(`../../../home`);
          });
        }
      });
    }
    else{
      return res.redirect('../../../');
    }
  })(req, res, next);
});

router.get('/logout', (req,res)=>{
  res.clearCookie('id');
  res.clearCookie('username');
  res.redirect('../../../');
});

module.exports = router;