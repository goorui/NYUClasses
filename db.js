const mongoose = require('mongoose');
const URLSlugs = require('mongoose-url-slugs');

const AnswerSchema = new mongoose.Schema({
  text: String,
  name: String
});
mongoose.model("Answer", AnswerSchema);

const QuestionSchema = new mongoose.Schema({
  text: String,
  name: String,
  answers: [{type:mongoose.Schema.Types.ObjectId, ref:'Answer'}]
});
QuestionSchema.plugin(URLSlugs('text name'));
mongoose.model("Question", QuestionSchema);

const CourseSchema = new mongoose.Schema({
  name: String,
  code: {type: String, required: true},
  questions: [{type:mongoose.Schema.Types.ObjectId, ref:'Question'}]
});
CourseSchema.plugin(URLSlugs('name code'));
mongoose.model("Course", CourseSchema);

// Students
// Our site requires authentication,
// NetID is the unique identifier of student
const StudentSchema = new mongoose.Schema({
  name: String,
  NetID: {type: String, required: true},
  // password provided by authentication plugin
  courses: [{type:mongoose.Schema.Types.ObjectId, ref:'Course'}]
});
mongoose.model("Student", StudentSchema);

mongoose.set('useCreateIndex', true);
mongoose.set('useFindAndModify', false);
mongoose.set('useNewUrlParser', true);


// is the environment variable, NODE_ENV, set to PRODUCTION? 
let dbconf;
if (process.env.NODE_ENV === 'PRODUCTION') {
  console.log('production mode');
  // if we're in PRODUCTION mode, then read the configration from a file
  // use blocking file io to do this...
  const fs = require('fs');
  const path = require('path');
  const fn = path.join(__dirname, 'config.json');
  const data = fs.readFileSync(fn);

  // our configuration file will be in json, so parse it and set the
  // conenction string appropriately!
  const conf = JSON.parse(data);
  dbconf = conf.dbconf;
} 
else {
  // if we're not in PRODUCTION mode, then use
  console.log('not production mode');
  dbconf = 'mongodb://localhost/hg1413';
}
mongoose.connect(dbconf);

