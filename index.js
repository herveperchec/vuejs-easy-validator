/*

    Validator service

    By Hervé PERCHEC

    -> Validate a form

*/

const ValidatorTypes = [
    'array',
    'boolean',
    'number',
    'string',
    'object',
]

const ValidatorLengths = [
    'min:[0-9]+',
    'max:[0-9]+',
]

/**
 * Use this function to generate computed method for each field state
 * Return an object : {
 *    [fieldName]State() : {
 *        See below
 *        Return [fieldName]Checker() value or error
 *    }
 *    ...
 * }
 * 
 * -> Use in vue instance or component in 'computed' :
 *    ...mapFieldStates([
 *        '[fieldName]'
 *    ]),
 *    // your others functions
 * 
 * !! NEED 'mapFieldCheckers' CALL TO WORK !!
 * 
 * Add prefix value (string) if specified
 * 
 * @param {object} object 
 */
export function mapFieldStates ( { fields, prefix = "" } ) {
    var prefixOk = ""
    if ( typeof prefix == 'string' ) {
        prefixOk = prefix
    }
    else {
        console.error("Validator.js | In 'mapFieldStates' function error: invalid type of prefix value (string required)")
    }
    // Reduce fields in o 
    return fields.reduce( (o, field) => {
        const fieldNameState = prefixOk + field + 'State'
        o[fieldNameState] = {
            // To generate computed method
            get() {
                // Test if checker method is defined
                if ( !eval('this.'+prefixOk+field+'Checker') ) {
                    console.error("Validator.js | In 'mapFieldStates' function error: called method '"+prefixOk+field+"Checker' is not defined in the parent scope")
                    return false
                }
                return eval('this.'+prefixOk+field+'Checker()') // Don't forget '()' to call checker method
			},
        }
        return o
    }, {} )
}

/**
 * Use this function to generate checker method (will return boolean) for each field
 * Return an object : {
 *    [fieldName]Checker() : {
 *        See below
 *        Return true if field has errors, else false
 *    }
 *    ...
 * }
 * 
 * -> Use in vue instance or component in 'methods' :
 *    ...mapFieldCheckers({
 *        ref: '[validatorRef]' // Where [validatorRef] is how you call the validator (e.g 'this.form.validator')
 *        fields: ['[fieldName]', '[fieldName]', ... ]
 *        prefix: "Prefix_"
 *    }),
 *    // your others functions
 * 
 * Add prefix value (string) if specified
 * 
 * @param {object} object 
 */
export function mapFieldCheckers ( { ref, fields, prefix = "" } ) {
    var prefixOk = ""
    if ( typeof prefix == 'string' ) {
        prefixOk = prefix
    }
    else {
        console.error("Validator.js | In 'mapFieldCheckers' function error: invalid type of prefix value (string required)")
    }
    // Reduce fields in o 
    return fields.reduce( (o, field) => {
        const fieldNameChecker = prefixOk + field + 'Checker'
        o[fieldNameChecker] = function() {
            var validator = eval(ref)
            return !(validator.fields[field].hasErrors()) 
        }   
        return o
    }, {} )
}

export class Validator {

    /**
     * Constructor 
     * 
     * @param {Array} fields // Array of field definitions
     */
    constructor(fields = []) {
        this.fields = {}
        this.savedErrors = []
        // Loop for fields
        for ( var field in fields ) {
            // Dynamic field is set with new checked ValidatorField (with Validator checkField static method)
            this.fields[fields[field].name] = this.constructor.checkField( new ValidatorField (fields[field]) )
        }
    }

    /**
     * Set errors
     * 
     * @param {Array} errors
     */
    set errors(errors) {
        if ( !(errors instanceof Array) ) {
            console.error("Validator.js | Setter 'errors' function error: invalid parameter type ("+typeof errors+"), must be an array ")
            return false
        }
        else {
            errors.forEach( ( obj, index ) => {
                if ( !(obj.field instanceof ValidatorField) ) {
                    console.error("Validator.js | Setter 'errors' function error (array key: "+index+"): property 'field' (type: "+typeof obj.field+") must be instance of ValidatorField ")
                    return false
                }
                else if ( !(obj.errors instanceof Array) ) {
                    console.error("Validator.js | Setter 'errors' function error (array key: "+index+"): property 'errors' (type: "+typeof obj.errors+") must be an array ")
                    return false
                }
            } )
            this.savedErrors = errors
        }
    }

    /**
     * Get errors
     */
    get errors() {
        // Refresh and return
        this.refreshErrors()
        return this.savedErrors
    }

    /**
     * Return true if form is valid
     */
    isValid() {
        return this.errors.length > 0 ? false : true
    }

    /**
     * Refresh errors
     */
    refreshErrors() {
        this.errors = Object.keys(this.fields).reduce( (array, fieldName) => {
            if ( this.fields[fieldName].hasErrors() ) {
                array.push({
                    field: this.fields[fieldName],
                    errors: this.fields[fieldName].errors
                })
            }
            return array
        }, [] )
    }

    /**
     * Get an array of fields (ValidatorField)
     */
    getFields() {
        return Object.keys(this.fields).reduce( (array, fieldName) => {
            array.push(this.fields[fieldName])
            return array
        }, [] )
    }

    /**
     * Return output
     */
    get output() {
        var param = {}
        Object.keys(this.fields).forEach( (fieldName) => {
            param[fieldName] = this.fields[fieldName].value 
        })
        return param
    }

    /**
     * Call all checking methods for a field
     * 
     * @param {object} f 
     */
    static checkField(f) {
        if ( f.verify ) {
            // Init some usefull variables
            var ValidatorTypesRegExp = new RegExp("("+ValidatorTypes.join("|")+")")
            var ValidatorLengthsRegExp = new RegExp("("+ValidatorLengths.join("|")+")") 
            // If verify is a function -> custom verification
            if ( typeof f.verify == 'function') {
                f = Validator.checkFilter(f)
            }
            // Else -> string : "tag|tag|tag" (e.g "required|string|max:255")
            else{
                f.verify.split("|").forEach( function(tag) {
                    // If tag is "required"
                    if ( tag == "required" ) {
                        f = Validator.checkRequired(f)
                    }
                    // If known type tag
                    if ( ValidatorTypes.indexOf( tag ) > -1 ) {
                        f = Validator.checkType(f, f.verify.match(ValidatorTypesRegExp)[0])
                    }
                    // If known length tag
                    var lengthMatch = f.verify.match(ValidatorLengthsRegExp) // Find value
                    if ( lengthMatch !== null ) {
                        var lengthMethod
                        var givenValue
                        ;[lengthMethod, givenValue] = lengthMatch[0].split(":") // Split both between ":" and take first ('min' or 'max')
                        f = eval('Validator.check' + lengthMethod[0].toUpperCase() + lengthMethod.substring(1) + '(f, givenValue)' )
                    }
                } )
            }
        }

        return f

    }

    /**
     * Check required
     * 
     * @param {object} f // Field object
     */
    static checkRequired(f) {
        // If not corresponding type (+ array case)
        if ( f.value == "" || f.value == undefined || f.value == null ) {   
            f.setError({
                prop: 'required', 
                method: 'checkRequired', 
                text: 'Invalid value: field "'+ f.name +'" is required'
            })
        }
        return f
    }

    /**
     * Check type
     * 
     * @param {object} f // Field object
     * @param {string} type // Wanted type
     */
    static checkType(f, type) {
        // If not corresponding type (+ array case)
        if ( !( ( type == "array" && f.value instanceof Array ) || typeof f.value == type ) ) {   
            f.setError({
                prop: 'type', 
                method: 'checkType', 
                text: 'Invalid value type: ' + typeof f.value + '. Asked: ' + type
            })
        }
        return f
    }

    /**
     * Check min
     * 
     * @param {object} f // Field object
     * @param {number} min // Wanted minimum
     */
    static checkMin(f, min) {
        var test
        var errorText
        if ( typeof f.value == 'string' ) {
            test = f.value.length
            errorText = 'Invalid length for field value (string): "'+f.value+'". Min length: ' + min
        } 
        else if ( typeof f.value == 'number' ) {
            test = f.value
            errorText = 'Invalid range for field value (number): '+f.value+'. Minimum: ' + min
        }
        else{
            f.setError({
                prop: 'min', 
                method: 'checkMin', 
                text: 'Field value must be string or number to check "min"'
            })
        }
        if ( !( test >= min ) ) {
            f.setError({
                prop: 'min', 
                method: 'checkMin', 
                text: errorText
            })
        }
        return f
    }

    /**
     * Check max
     * 
     * @param {object} f // Field object
     * @param {number} max // Wanted minimum
     */
    static checkMax(f, max) {
        var test
        var errorText
        if ( typeof f.value == 'string' ) {
            test = f.value.length
            errorText = 'Invalid length for field value (string): "'+f.value+'". Max length: ' + max
        } 
        else if ( typeof f.value == 'number' ) {
            test = f.value
            errorText = 'Invalid range for field value (number): '+f.value+'. Maximum: ' + max
        }
        else{
            f.setError({
                prop: 'max', 
                method: 'checkMax', 
                text: 'Field value must be string or number to check "max"'
            })
        }
        if ( !( test <= max ) ) {
            f.setError({
                prop: 'max', 
                method: 'checkMax', 
                text: errorText
            })
        }
        return f
    }

    /**
     * Check filter
     * 
     * @param {object} f // Field object
     */
    static checkFilter(f) {
        if ( !f.verify(f.value) ) {
            f.setError({
                prop: 'filter', 
                method: 'checkFilter', 
                text: 'Custom function return false'
            })
        }
        return f
    }

}

export class ValidatorField {

    constructor (obj) {
        // Field properties
        this.name = null
        this.savedValue = null
        this.verify = null
        // Errors
        this.errors = []
        Object.assign(this, obj)
    }

    /**
     * Call checking method
     */
    check() {
        Validator.checkField(this)
    }

    /**
     * Set field value
     * 
     * @param {mixed} value 
     */
    set value(value) {
        this.errors = [] // Clear errors before reset
        this.savedValue = value // Assign new value
        this.check()
    }

    /**
     * Get field value
     */
    get value() {
        return this.savedValue
    }

    /**
     * Push an error message in the object errors array
     * 
     * @param {string} error // Error message
     */
    setError(error) {
        this.errors.push(error)
    }

    /**
     * Return true if field has error(s), else: false
     */
    hasErrors() {
        if ( this.errors.length > 0 ) {
            return true
        }
        return false
    }

}

export default Validator
