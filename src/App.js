import React, { Component } from 'react'

import ContentEditable from './components/ContentEditable'
import AppHeader from './components/AppHeader'
import SettingsMenu from './components/SettingsMenu'
import SettingsIcon from './components/SettingsIcon'
import analytics from './utils/analytics'
import api from './utils/api'
import sortByDate from './utils/sortByDate'
import isLocalHost from './utils/isLocalHost'
import '../node_modules/bootstrap/dist/css/bootstrap.min.css'
import '../node_modules/bootstrap/dist/js/bootstrap.bundle'
import 'material-symbols';
import './App.css'


export default class App extends Component {
  
  state = {
    exercises: [],
    showMenu: false,
    selectedCategory: 'push'
  }
  
  
  componentDidMount() {

   
    /* Track a page view */
    analytics.page()

    // Fetch all exercises
    api.readAll().then((exercises) => {
      if (exercises.message === 'unauthorized') {
        if (isLocalHost()) {
          alert('FaunaDB key is not unauthorized. Make sure you set it in terminal session where you ran `npm start`. Visit http://bit.ly/set-fauna-key for more info')
        } else {
          alert('FaunaDB key is not unauthorized. Verify the key `FAUNADB_SERVER_SECRET` set in Netlify enviroment variables is correct')
        }
        return false
      }

      console.log('all exercises', exercises)
      this.setState({
        exercises: exercises
      })
    })
  }
  saveExercise = (e) => {
    e.preventDefault()
    const { exercises } = this.state
    const exerciseValue = this.inputElement.value
    const exerciseWeight =  this.weightInputElement.value
    const exerciseCat = this.catSelectElement.value

    if (!exerciseValue) {
      alert('Please add exercise title')
      this.inputElement.focus()
      return false
    }

    // reset input to empty
    this.inputElement.value = ''
    this.weightInputElement.value = ''
    this.catSelectElement.value = ''

    const exerciseInfo = {
      title: exerciseValue,
      weight: exerciseWeight,
      cat: exerciseCat,
      completed: false,
    }
    // Optimistically add exercise to UI
    const newExerciseArray = [{
      data: exerciseInfo,
      ts: new Date().getTime() * 10000
    }]

    const optimisticExerciseState = newExerciseArray.concat(exercises)

    this.setState({
      exercises: optimisticExerciseState
    })
    // Make API request to create new todo
    api.create(exerciseInfo).then((response) => {
      console.log(response)
      /* Track a custom event */
      analytics.track('exerciseCreated', {
        category: 'exercises',
        label: exerciseValue,
      })
      // remove temporaryValue from state and persist API response
      const persistedState = removeOptimisticExercise(exercises).concat(response)
      // Set persisted value to state
      this.setState({
        exercises: persistedState
      })
    }).catch((e) => {
      console.log('An API error occurred', e)
      const revertedState = removeOptimisticExercise(exercises)
      // Reset to original state
      this.setState({
        exercises: revertedState
      })
    })
  }
  deleteExercise = (e) => {
    const { exercises } = this.state
    const exerciseId = e.target.dataset.id

    // Optimistically remove exercise from UI
    const filteredExercises = exercises.reduce((acc, current) => {
      const currentId = getExerciseId(current)
      if (currentId === exerciseId) {
        // save item being removed for rollback
        acc.rollbackExercise = current
        return acc
      }
      // filter deleted exercise out of the exercises list
      acc.optimisticState = acc.optimisticState.concat(current)
      return acc
    }, {
      rollbackExercise: {},
      optimisticState: []
    })

    this.setState({
      exercises: filteredExercises.optimisticState
    })

    // Make API request to delete exercise
    api.delete(exerciseId).then(() => {
      console.log(`deleted exercise id ${exerciseId}`)
      analytics.track('exerciseDeleted', {
        category: 'exercises',
      })
    }).catch((e) => {
      console.log(`There was an error removing ${exerciseId}`, e)
      // Add item removed back to list
      this.setState({
        exercises: filteredExercises.optimisticState.concat(filteredExercises.rollbackExercise)
      })
    })
  }
  handleExerciseCheckbox = (event) => {
    const { exercises } = this.state
    const { target } = event
    const exerciseCompleted = target.checked
    const exerciseId = target.dataset.id

    const updatedExercises = exercises.map((exercise, i) => {
      const { data } = exercise
      const id = getExerciseId(exercise)
      if (id === exerciseId && data.completed !== exerciseCompleted) {
        data.completed = exerciseCompleted
      }
      return exercise
    })

    this.setState({
      exercises: updatedExercises
    }, () => {
      api.update(exerciseId, {
        completed: exerciseCompleted
      }).then(() => {
        console.log(`update exercise ${exerciseId}`, exerciseCompleted)
        const eventName = (exerciseCompleted) ? 'exerciseCompleted' : 'exerciseUnfinished'
        analytics.track(eventName, {
          category: 'exercises'
        })
      }).catch((e) => {
        console.log('An API error occurred', e)
      })
    })
  }
  updateExerciseTitle = (event, currentValue) => {
    let isDifferent = false
    const exerciseId = event.target.dataset.key

    const updatedExercises = this.state.exercises.map((exercise, i) => {
      const id = getExerciseId(exercise)
      if (id === exerciseId && exercise.data.title !== currentValue) {
        exercise.data.title = currentValue
        isDifferent = true
      }
      return exercise
    })

    // only set state if input different
    if (isDifferent) {
      this.setState({
        exercises: updatedExercises
      }, () => {
        api.update(exerciseId, {
          title: currentValue
        }).then(() => {
          console.log(`update exercise ${exerciseId}`, currentValue)
          analytics.track('exerciseUpdated', {
            category: 'exercises',
            label: currentValue
          })
        }).catch((e) => {
          console.log('An API error occurred', e)
        })
      })
    }
  }
  updateExerciseWeight = (event, currentValue) => {
    let isDifferent = false
    const exerciseId = event.target.dataset.key

    const updatedExercises = this.state.exercises.map((exercise, i) => {
      const id = getExerciseId(exercise)
      if (id === exerciseId && exercise.data.weight !== currentValue) {
        exercise.data.weight = currentValue
        isDifferent = true
      }
      return exercise
    })

    // only set state if input different
    if (isDifferent) {
      this.setState({
        exercises: updatedExercises
      }, () => {
        api.update(exerciseId, {
          title: currentValue
        }).then(() => {
          console.log(`update exercise ${exerciseId}`, currentValue)
          analytics.track('exerciseUpdated', {
            category: 'exercises',
            label: currentValue
          })
        }).catch((e) => {
          console.log('An API error occurred', e)
        })
      })
    }
  }
  updateExerciseCat = (event, currentValue) => {
    let isDifferent = false
    const exerciseId = event.target.dataset.key

    const updatedExercises = this.state.exercises.map((exercise, i) => {
      const id = getExerciseId(exercise)
      if (id === exerciseId && exercise.data.cat !== currentValue) {
        exercise.data.cat = currentValue
        isDifferent = true
      }
      return exercise
    })

    // only set state if input different
    if (isDifferent) {
      this.setState({
        exercises: updatedExercises
      }, () => {
        api.update(exerciseId, {
          title: currentValue
        }).then(() => {
          console.log(`update exercise ${exerciseId}`, currentValue)
          analytics.track('exerciseUpdated', {
            category: 'exercises',
            label: currentValue
          })
        }).catch((e) => {
          console.log('An API error occurred', e)
        })
      })
    }
  }
  clearCompleted = () => {
    const { exercises } = this.state

    // Optimistically remove exercises from UI
    const data = exercises.reduce((acc, current) => {
      if (current.data.completed) {
        // save item being removed for rollback
        acc.completedExerciseIds = acc.completedExerciseIds.concat(getExerciseId(current))
        return acc
      }
      // filter deleted exercise out of the exercises list
      acc.optimisticState = acc.optimisticState.concat(current)
      return acc
    }, {
      completedExerciseIds: [],
      optimisticState: []
    })

    // only set state if completed exercises exist
    if (!data.completedExerciseIds.length) {
      alert('Please check off some exercises to batch remove them')
      this.closeModal()
      return false
    }

    this.setState({
      exercises: data.optimisticState
    }, () => {
      setTimeout(() => {
        this.closeModal()
      }, 600)

      api.batchDelete(data.completedExerciseIds).then(() => {
        console.log(`Batch removal complete`, data.completedExerciseIds)
        analytics.track('exercisesBatchDeleted', {
          category: 'exercises',
        })
      }).catch((e) => {
        console.log('An API error occurred', e)
      })
    })
  }
  closeModal = (e) => {
    this.setState({
      showMenu: false
    })
    analytics.track('modalClosed', {
      category: 'modal'
    })
  }
  openModal = () => {
    this.setState({
      showMenu: true
    })
    analytics.track('modalOpened', {
      category: 'modal'
    })
  }
  
updateSelectedEx = (c) => {
  console.log('event target value is: ' + c)
  this.setState({selectedCategory: c})
  console.log('this.state.selectedCategory is ' + this.state.selectedCategory)
}
//  updateCategory = (c) => {

//   const exerciseListCategory = c
//    console.log('e.target.value is: ' + c)
//    let selectedCat = 'push';
//    if(exerciseListCategory !== undefined) {
//     selectedCat = c;
//    }
//    console.log('selected cat is: ' + selectedCat)
//     const { exercises } = this.state
//     const timeStampKey = 'ts'
//     const orderBy = 'desc' // or `asc`
//     const sortOrder = sortByDate(timeStampKey, orderBy)
//     const exercisesByDate = exercises.sort(sortOrder)

//     exercisesByDate.forEach(ex => {
//       console.log('excercise cat in new func: ' + ex.data.cat)
//       // let displayClassName = ""
//       // console.log('excercise cat in new func: ' + ex.d)
     
//       // if(selectedCat == ex.cat) {
//       //   displayClassName = "exercise-item show"
//       // } else {
//       //   displayClassName = "exercise-item hide"
//       // }
      
//     });

  
//  }
  renderExercises = () => {
   const exerciseListCategory = this.state.selectedCategory
  //  console.log('e.target.value is: ' + c)
  //  let selectedCat = 'push';
  //  if(exerciseListCategory !== undefined) {
  //   selectedCat = c;
  //  }
  //  console.log('selected cat is: ' + selectedCat)
    const { exercises } = this.state
    

    if (!exercises || !exercises.length) {
      // Loading State here
      return null
    }

    const timeStampKey = 'ts'
    const orderBy = 'desc' // or `asc`
    const sortOrder = sortByDate(timeStampKey, orderBy)
    const exercisesByDate = exercises.sort(sortOrder)

    return exercisesByDate.map((exercise, i) => {
      const { data, ref } = exercise
      const id = getExerciseId(exercise)
      // only show delete button after create API response returns
      let deleteButton
      if (ref) {
        deleteButton = (
          <button data-id={id} onClick={this.deleteExercise}>
            delete
          </button>
        )
      }
      // Set the display class to only show exercises from the selected category 
      
      let displayClassName = ""
      // console.log(data.cat)
      if(exerciseListCategory == data.cat) {
        displayClassName = "exercise-item show"
      } else {
        displayClassName = "exercise-item hide"
      }
      
      
     
      const boxIcon = (data.completed) ? '#exercise__box__done' : '#exercise__box'
      return (
        <div key={i} className={displayClassName}>
          <label className="exercise">
            <input
              data-id={id}
              className="exercise__state"
              type="checkbox"
              onChange={this.handleExerciseCheckbox}
              checked={data.completed}
            />
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 25" className="exercise__icon">
              <use xlinkHref={`${boxIcon}`} className="exercise__box"></use>
              <use xlinkHref="#exercise__check" className="exercise__check"></use>
            </svg>
            <div className='exercise-list-title'>
              <ContentEditable
                tagName='span'
                editKey={id}
                onBlur={this.updateExerciseTitle} // save on enter/blur
                html={data.title}
                // onChange={this.handleDataChange} // save on change
              />
            </div>
            <div className='exercise-list-title'>
              <ContentEditable
                tagName='span'
                editKey={id}
                onBlur={this.updateExerciseWeight} // save on enter/blur
                html={data.weight + 'kg'}
                // onChange={this.handleDataChange} // save on change
              />
            </div>
            <div className='exercise-list-title'>
              <ContentEditable
                tagName='span'
                editKey={id}
                onBlur={this.updateExerciseCat} // save on enter/blur
                html={data.cat}
                // onChange={this.handleDataChange} // save on change
              />
            </div>
          </label>
          {deleteButton}
        </div>
      )
      
    })
 
  }
  // resetState = () => {
  //   {this.setState({exerciseCategory: ''})}
  // }
  // setSelectedCat = (v) => this.setState({exerciseCategory: v}) 
  render() {
    // const [selectedCat, setSelectedCat] = useState('')
    // const [selectedCat, setSelectedCat] = () => { useState('')}
    // const selectedCat = this.state.exerciseCategory
    
    return (
      <div className='app'>

        <AppHeader />
        <div className="create-exercise p-3">
        
            <a className="create-btn d-flex flex-row align-items-center" href="#create" data-bs-toggle="collapse" aria-expanded="false">
              Create exercise 
            {/* <span className="material-symbols-outlined ps-1 pt-1">expand_more</span> */}
            </a>
          <div id="create" className="create-form collapse">
            
              <SettingsIcon onClick={this.openModal} className='mobile-toggle' />
            
            <form className='exercise-create-wrapper' onSubmit={this.saveExercise}>
              <input
                className='exercise-create-input'
                placeholder='Exercise name'
                name='name'
                ref={el => this.inputElement = el}
                autoComplete='off'
                style={{marginRight: 20}}
              />
              <input
                className='exercise-create-input'
                placeholder='Weight (kg)'
                name='weight'
                ref={el => this.weightInputElement = el}
                autoComplete='off'
                style={{marginRight: 20}}
              />
              <label for="cat">Category</label>
              <select 
                id="cat" 
                name="cat"
                ref={el => this.catSelectElement = el}
                style={{marginRight: 20}}
                >
                <option value="push">Push</option>
                <option value="pull">Pull</option>
                <option value="legs">Legs</option>
              </select>
              <div className='exercise-actions'>
                <button className='exercise-create-button'>
                  Create exercise
                </button>
                <SettingsIcon onClick={this.openModal}  className='desktop-toggle' />
              </div>
            </form>

          </div>

        </div>
        

        <div className='exercise-list'>
          
          

         <div className="select-cat px-1">
         <select
              className="px-2 me-1 py-2"
              onChange={e => this.updateSelectedEx(e.target.value)}
              id="catList" 
              name="catList"
              defaultValue="push"
              >
              <option className="select-option" value="push">Push</option>
              <option className="select-option" value="pull">Pull</option>
              <option className="select-option" value="legs">Legs</option>
            </select>
         </div>

       
         
          

          {this.renderExercises()}
          
          
        </div>
        <SettingsMenu
          showMenu={this.state.showMenu}
          handleModalClose={this.closeModal}
          handleClearCompleted={this.clearCompleted}
        />
      </div>
    )
  }
}

function removeOptimisticExercise(exercises) {
  // return all 'real' exercises
  return exercises.filter((exercise) => {
    return exercise.ref
  })
}

function getExerciseId(exercise) {
  if (!exercise.ref) {
    return null
  }
  return exercise.ref['@ref'].id
}
