import { fromJS } from "immutable"
import { fromJSOrdered, validateParam } from "core/utils"
import win from "../../window"

import {
	UPDATE_SPEC,
  UPDATE_URL,
  UPDATE_JSON,
  UPDATE_PARAM,
  VALIDATE_PARAMS,
  SET_RESPONSE,
  SET_REQUEST,
  UPDATE_RESOLVED,
  UPDATE_OPERATION_VALUE,
  CLEAR_RESPONSE,
  CLEAR_REQUEST,
  ClEAR_VALIDATE_PARAMS,
  SET_SCHEME,
	UPDATE_TOKEN,
	UPDATE_PARAMS_BATCH
} from "./actions"

export default {

  [UPDATE_SPEC]: (state, action) => {
    return (typeof action.payload === "string")
      ? state.set("spec", action.payload)
      : state
  },

  [UPDATE_URL]: (state, action) => {
    return state.set("url", action.payload+"")
  },

  [UPDATE_JSON]: (state, action) => {
    return state.set("json", fromJSOrdered(action.payload))
  },

  [UPDATE_RESOLVED]: (state, action) => {
		// console.log('UPDATE_RESOLVED:', state);
		// console.log('token:',state.get('access_token'));
    return state.setIn(["resolved"], fromJSOrdered(action.payload))
  },

  [UPDATE_PARAM]: ( state, {payload} ) => {
    let { path, paramName, value, isXml } = payload
    return state.updateIn( [ "resolved", "paths", ...path, "parameters" ], fromJS([]), parameters => {
      let index = parameters.findIndex( p => p.get( "name" ) === paramName )

      if (!(value instanceof win.File)) {
        value = fromJSOrdered( value )
      }
      return parameters.setIn( [ index, isXml ? "value_xml" : "value" ], value)
    })
  },

  [VALIDATE_PARAMS]: ( state, { payload:  { pathMethod } } ) => {
    let operation = state.getIn( [ "resolved", "paths", ...pathMethod ] )
    let isXml = /xml/i.test(operation.get("consumes_value"))

    return state.updateIn( [ "resolved", "paths", ...pathMethod, "parameters" ], fromJS([]), parameters => {
      return parameters.withMutations( parameters => {
        for ( let i = 0, len = parameters.count(); i < len; i++ ) {
          let errors = validateParam(parameters.get(i), isXml)
          parameters.setIn([i, "errors"], fromJS(errors))
        }
      })
    })
  },
  [ClEAR_VALIDATE_PARAMS]: ( state, { payload:  { pathMethod } } ) => {
		// console.log(state.toJS());
    return state.updateIn( [ "resolved", "paths", ...pathMethod, "parameters" ], fromJS([]), parameters => {
      return parameters.withMutations( parameters => {
        for ( let i = 0, len = parameters.count(); i < len; i++ ) {
          parameters.setIn([i, "errors"], fromJS({}))
        }
      })
    })
  },

  [SET_RESPONSE]: (state, { payload: { res, path, method } } ) =>{
    let result
    if ( res.error ) {
      result = Object.assign({error: true}, res.err)
    } else {
      result = res
    }

    // Ensure headers
    result.headers = result.headers || {}

    let newState = state.setIn( [ "responses", path, method ], fromJSOrdered(result) )

    // ImmutableJS messes up Blob. Needs to reset its value.
    if (res.data instanceof win.Blob) {
      newState = newState.setIn( [ "responses", path, method, "text" ], res.data)
    }
    return newState
  },

  [SET_REQUEST]: (state, { payload: { req, path, method } } ) =>{
    return state.setIn( [ "requests", path, method ], fromJSOrdered(req))
  },

  [UPDATE_OPERATION_VALUE]: (state, { payload: { path, value, key } }) => {
		// console.log('changeConsumesValue:reducer');
    let operationPath = ["resolved", "paths", ...path]
    if(!state.getIn(operationPath)) {
      return state
    }
    return state.setIn([...operationPath, key], fromJS(value))
  },

  [CLEAR_RESPONSE]: (state, { payload: { path, method } } ) =>{
    return state.deleteIn( [ "responses", path, method ])
  },

  [CLEAR_REQUEST]: (state, { payload: { path, method } } ) =>{
    return state.deleteIn( [ "requests", path, method ])
  },

  [SET_SCHEME]: (state, { payload: { scheme, path, method } } ) =>{
    if ( path && method ) {
      return state.setIn( [ "scheme", path, method ], scheme)
    }

    if (!path && !method) {
      return state.setIn( [ "scheme", "_defaultScheme" ], scheme)
    }

  },

	[UPDATE_TOKEN]: (state, {payload} ) => {
		let token = payload
		let obj = {
			name: "access_token",
			in: "query",
			type: "string",
			value: token,
			format: "JSON",
			require: false,
			description: "The access token"
		}
		if (token) {
			return state.updateIn(["resolved", "paths"], fromJS([]), paths => {
				return paths.map( path => path.map( method => {
					let parameters = method.get("parameters")
					let index = parameters.findIndex(p => p.get("name") === "access_token")
					if (index > -1) {
						return method.set("parameters", parameters.setIn([index, "value"], token))
					}
					else {
						return method.set( "parameters", parameters.push( fromJS(obj) ) )
					}
				}))
			})
		}
		// console.l?og(state.toJS());
		return state

	},

	[UPDATE_PARAMS_BATCH]: (state, {payload}) => {

		let { path, method, data } = payload

		state = state.updateIn(["resolved", "paths", path, method, "parameters"], fromJS([]), parameters => {
			return parameters.withMutations( parameters => {
        for ( let i = 0, len = parameters.count(); i < len; i++ ) {
          parameters.setIn([i, "errors"], fromJS({}))
        }
      })
		})

		let paramKeys = Object.keys(data)
		let operationPath = [path, method, "parameters"]

		for(let i = 0; i < paramKeys.length; i++) {
			let key = paramKeys[i]
			let { value, isXml } = data[key]
			state = state.updateIn(["resolved", "paths", ...operationPath], fromJS([]), parameters => {
				var index = parameters.findIndex(p => p.get("name") === key)
				if (index > -1) {
					parameters = parameters.setIn([ index, isXml ? "value_xml" : "value" ], value)
				}
				else {
					console.warn("Key does not exist: ", [path, method, key, value])
				}
				return parameters
			})
		} //end for

		let operation = state.getIn( ["resolved", "paths", path, method ] )
		let isXml = /xml/i.test(operation.get("consumes_value"))

		return state.updateIn( [ "resolved", "paths", ...operationPath ], fromJS([]), parameters => {
      return parameters.withMutations( parameters => {
        for ( let i = 0, len = parameters.count(); i < len; i++ ) {
          let errors = validateParam(parameters.get(i), isXml)
          parameters.setIn([i, "errors"], fromJS(errors))
        }
      })
    })
	}

}
