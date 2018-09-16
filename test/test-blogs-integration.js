'use strict';

const chai = require('chai');
const chaiHttp = require('chai-http');
const faker = require('faker');
const mongoose = require('mongoose');

mongoose.Promise = global.Promise;

const expect = chai.expect;

const { app, runServer, closeServer } = require('../server');
const { BlogPost } = require('../models');
const { TEST_DATABASE_URL } = require('../config');

chai.use(chaiHttp);


function seedBlogData() {
    console.info('seeding blog data');
    const seedData = [];
    
    for (let i=1; i<=10; i++) {
        seedData.push(generateBlogData());
    }

    return BlogPost.insertMany(seedData);
}

function generateAuthor() {
    return {
      author: {
        firstName: faker.name.firstName(),
        lastName: faker.name.lastName()
      }
    };
}

function generateBlogData() {
    return {
        author: generateAuthor(),
        title: faker.lorem.words(),
        content: faker.lorem.paragraph(),
        created: faker.date.recent()
    };
}

function tearDownDb() {
  return new Promise((resolve, reject) => {
    console.warn('Deleting datebase');
    return mongoose.connection.dropDatabase()
      .then(result => resolve(result))
      .catch(err => reject(err));
  });
}

describe('BlogPosts API resource', function() {

    before(function() {
      return runServer(TEST_DATABASE_URL);
    });
  
    beforeEach(function() {
      return seedBlogData();
    });
  
    afterEach(function() {
      return tearDownDb();
    });
  
    after(function() {
      return closeServer();
    });

describe('GET endpoint', function() {

    it('should return all existing blogposts', function() {
        let res;
        return chai.request(app)
        .get('/posts')
        .then(function(_res) {
            res = _res;
            expect(res).to.have.status(200);
            expect(res.body).to.have.lengthOf.at.least(1);
            return BlogPost.count();
        })
        .then(function(count) {
            expect(res.body).to.have.lengthOf(count);
        });
    });

    it('should return blogposts with right fields', function() {
        let resBlog;
        return chai.request(app)
          .get('/posts')
          .then(function(res) {
            expect(res).to.have.status(200);
            expect(res).to.be.json;
            expect(res.body).to.be.a('array');
            expect(res.body).to.have.lengthOf.at.least(1); 

            res.body.forEach(function(post) {
                expect(post).to.be.a('object');
                expect(post).to.include.keys(
                    'id', 'author', 'content', 'title', 'created'
                );
            });
            resBlog = res.body[0];
            return BlogPost.findById(resBlog.id);
          })
          .then(function(post) {
              
            // expect(resBlog.id).to.equal(post.id);
            expect(resBlog.author).to.equal(post.authorName);
            expect(resBlog.title).to.equal(post.title);
            expect(resBlog.content).to.equal(post.content);
            // expect(resBlog.created).to.equal(post.created);
          });
    });
});

describe('POST endpoint', function() {

    it('should add a new blog', function() {

      const newBlog = generateBlogData();

      return chai.request(app)
        .post('/posts')
        .send(newBlog)
        .then(function(res) {
          expect(res).to.have.status(201);
          expect(res).to.be.json;
          expect(res.body).to.be.a('object');
          expect(res.body).to.include.keys(
            'id', 'author', 'content', 'title', 'created');
          expect(res.body.title).to.equal(newBlog.title);
          expect(res.body.id).to.not.be.null;
          expect(res.body.content).to.equal(newBlog.content);
          expect(res.body.author).to.equal(
            `${newBlog.author.firstName} ${newBlog.author.lastName}`);
          // expect(res.body.created).to.equal(newBlog.created);

          return BlogPost.findById(res.body.id);
        })
        .then(function(blog) {
          expect(blog.title).to.equal(newBlog.title);
          expect(blog.author.firstName).to.equal(newBlog.author.firstName);
          expect(blog.author.lastName).to.equal(newBlog.author.lastName);
          expect(blog.content).to.equal(newBlog.content);
          // expect(blog.created).to.equal(newBlog.created);
        });
    });
  });

  describe('PUT endpoint', function() {

    it('should update fields you send over', function() {
      const updateData = {
        title: 'fofofofofofofof',
        content: 'futuristic fusion'
      };

      return BlogPost
        .findOne()
        .then(function(post) {
          updateData.id = post.id;

          return chai.request(app)
            .put(`/posts/${post.id}`)
            .send(updateData);
        })
        .then(function(res) {
          expect(res).to.have.status(204);

          return BlogPost.findById(updateData.id);
        })
        .then(function(blog) {
          expect(blog.title).to.equal(updateData.title);
          expect(blog.content).to.equal(updateData.content);
        });
    });
  });

  describe('DELETE endpoint', function() {
    
    it('delete a blog by id', function() {

      let post;

      return BlogPost
        .findOne()
        .then(function(_post) {
          post = _post;
          return chai.request(app).delete(`/posts/${post.id}`);
        })
        .then(function(res) {
          expect(res).to.have.status(204);
          return BlogPost.findById(post.id);
        })
        .then(function(_post) {
          expect(_post).to.be.null;
        });
    });
  });
});