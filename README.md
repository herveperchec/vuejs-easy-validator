# vuejs-easy-validator

A useful form validator for VueJS framework

## Introduction

Suppose you work with VueJS framework.  
Imagine a form with a lot of fields.  
You need to write methods, check functions, computed state property... for each field.  
For you : **vuejs-easy-validator**

## Getting started

Import package in your app or in your SFC component :

```javascript
// Works with Vue
import Vue from 'vue'
// Import (only class)
import Validator from 'vuejs-easy-validator'
// Import with 'map' functions
import { Validator, mapFieldStates, mapFieldCheckers } from 'vuejs-easy-validator'
// ...
```


## Usage

### Basic example

Use validator to check form

HTML template

```html
<template>

    <form method="post" action="/articles" @submit="handleSubmit">

        <label for="articleTitle">Title :</label>
        <input v-model="form.validator.fields.title.value" 
               id="articleTitle" 
               type="text" 
               name="title" 
               placeholder="Article title"/>

        <label for="articleContent">Content :</label>
        <input v-model="form.validator.fields.content.value" 
               id="articleContent" 
               type="text" 
               name="content" 
               placeholder="Article content" />

        <input type="submit" name="submit" value="Save" />

    </form>

</template>
```

Javascript

```js
import Validator from 'vuejs-easy-validator'
export default {
    data() {
        return {
            form: {
                // Empty object for validator
                validator: {},
                // Field definitions
                defs: [
                    // Article title
                    { name: 'title', value: '', verify: 'required|string|max:255' },
                    // Article content
                    { name: 'content', value: '', verify: 'string' }
                ]
            }
        }
    },
    methods: {
        handleSubmit: function (evt) {
            if ( this.form.validator.isValid() ) {
                console.log("Success!")
            }
            else {
                console.log("Ooops... an error has occurred!")
            }
            evt.preventDefault() // Prevent form from submitting
        }
    },
    created() {
        // You need to init form when component is 'created'
        this.form.validator = new Validator(this.form.defs)
    }
}
```

### Example with 'map' functions

HTML template

Use 'map' functions to generate automatically computed properties and check methods

```html
<template>

    <form @submit="handleSubmit">

        <label for="articleTitle">Title :</label>
        <input v-model="form.validator.fields.title.value" 
               id="articleTitle" 
               type="text" 
               name="title" 
               placeholder="Article title"/>
        <p v-if="titleState">OK! The title is valid!</p>
        <p v-else>Article must have a title! (max: 255)</p>

        <label for="articleContent">Content :</label>
        <input v-model="form.validator.fields.content.value" 
               id="articleContent" 
               type="text" 
               name="content" 
               placeholder="Article content" />
        <p v-if="titleState">OK! The content is valid!</p>
        <p v-else>Article must have a content!</p>

        <label for="articleAuthorId">Author ID :</label>
        <input v-model="form.validator.fields.authorId.value" 
               id="articleAuthorId" 
               type="number" 
               name="authorId" 
               placeholder="Article author ID" />
        <p v-if="authorIdState">OK! The author ID is valid!</p>
        <p v-else>Article must have an author ID!</p>

        <input type="submit" name="submit" value="Save" />

    </form>

</template>
```
Javascript
```js
import { Validator, mapFieldStates, mapFieldCheckers } from 'vuejs-easy-validator'  
export default {
    data() {
        return {
            form: {
                // Empty object for validator
                validator: {},
                // Field definitions
                defs: [
                    // Article title
                    { name: 'title', value: '', verify: 'required|string|max:255' },
                    // Article slug
                    { name: 'slug', value: '', varify: function(value) {
                        if ( /* value.match( new RegExp( "^([a-z0-9]|[a-z0-9]+-([a-z0-9]+-)*[a-z])$" ) ) */ ) { // preg match slug
                            return true 
                        }
                        else {
                            return false
                        }
                    } },
                    // Article content
                    { name: 'content', value: '', verify: 'required|string' },
                    // Article author ID
                    { name: 'authorId', value: null, verify: 'required|number|min:1' }
                ]
            }
        }
    },
    computed: {
        // This function return computed method for each given field. See below
        ...mapFieldStates( {
            ref: 'this.form.validator',
            fields: [ 'title', 'content', 'authorId' ] // -> titleState, contentState, authorIdState
        } ),
    },
    methods: {
        // This function return check method for each given field. See below
        ...mapFieldCheckers( {
            ref: 'this.form.validator',
            fields: [ 'title', 'content', 'authorId' ] // -> titleChecker, contentChecker, authorIdChecker
        } ),
        handleSubmit: function (evt) {
            if ( this.form.validator.isValid() ) {
                axios.post( '/articles', this.validator.output )
                     .then( (response) => {
                         console.log("Success!")
                     } )
                     .catch( (error) => {
                         console.log("Error!")
                     } )
            }
            else {
                console.log("Ooops... an error has occurred!")
                this.form.validator.errors.forEach( (fieldWithErrors) => {
                    console.log("----")
                    console.log("Error in : '" + fieldWithErrors.field.name + "' field ")
                    fieldWithErrors.errors.forEach( (error) => {
                        console.log("- for '" + error.prop + "', in '" + error.method + "' method : " + error.text )
                    } ) 
                } )
            }
            evt.preventDefault() // Prevent form from submitting
        }
    },
    created() {
        // You need to init form when component is 'created'
        this.form.validator = new Validator(this.form.defs)
    }
}
```

Enjoy! ... and sorry for my english ^^

----
