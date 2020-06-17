import React from 'react';
import ReactDOM from 'react-dom';
import {Router} from 'react-router-dom'
import './index.css';
import App from './App';
import { createStore, applyMiddleware, combineReducers,compose } from 'redux';
import thunk from "redux-thunk"
import UserReducer from './reducer/UserReducer'
import {Provider} from "react-redux"
import * as serviceWorker from './serviceWorker';
import history from './history'

const rootReducer = combineReducers({users: UserReducer})
const store = createStore(rootReducer,compose( applyMiddleware(thunk),window.__REDUX_DEVTOOLS_EXTENSION__ && window.__REDUX_DEVTOOLS_EXTENSION__()))

ReactDOM.render(
  <Provider store={store}>
  <React.StrictMode>
        <link
  rel="stylesheet"
  href="https://maxcdn.bootstrapcdn.com/bootstrap/4.5.0/css/bootstrap.min.css"
  integrity="sha384-9aIt2nRpC12Uk9gS9baDl411NQApFmC26EwAOH8WgZl5MYYxFfc+NcPb1dKGj7Sk"
  crossorigin="anonymous"
/>
    <Router history={history}>
    <App />
    </Router>
  </React.StrictMode>
  </Provider>,
  document.getElementById('root')
);

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();
