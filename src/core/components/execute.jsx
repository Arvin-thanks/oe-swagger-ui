import React, { Component, PropTypes } from "react"
import { fromJS } from "immutable"
export default class Execute extends Component {

  static propTypes = {
    specSelectors: PropTypes.object.isRequired,
    specActions: PropTypes.object.isRequired,
    operation: PropTypes.object.isRequired,
    path: PropTypes.string.isRequired,
    getComponent: PropTypes.func.isRequired,
    method: PropTypes.string.isRequired,
    onExecute: PropTypes.func,
    authSelectors: PropTypes.object.isRequired,
    getParam: PropTypes.func
  }

  onClick=()=>{
    let { specSelectors, specActions, operation, path, method, authSelectors, getParam } = this.props
    let token = authSelectors.getAccessToken()
    let params = getParam()

    specActions.clearValidateParams([path, method])

    specActions.updateParamsBatch(path, method, params)

    specActions.validateParams( [path, method] )

    if ( specSelectors.validateBeforeExecute([path, method]) ) {
      if(this.props.onExecute) {
        this.props.onExecute()
      }
      if (typeof token === 'string' && token.length) {
        operation = operation.setIn(["parameters"], operation.get("parameters").push(fromJS({
          name: "access_token",
          format: "JSON",
          value: token,
          type: "string",
          in: "query"
        })))
      }     

      specActions.execute( { operation, path, method } )
    }
  }

  onChangeProducesWrapper = ( val ) => this.props.specActions.changeProducesValue([this.props.path, this.props.method], val)

  render(){
    return (
        <button className="btn execute opblock-control__btn" onClick={ this.onClick }>
          Execute
        </button>
    )
  }
}
