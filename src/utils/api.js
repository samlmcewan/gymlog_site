/* Api methods to call /functions */

const create = (data) => {
  return fetch('/.netlify/functions/exercises-create', {
    body: JSON.stringify(data),
    method: 'POST'
  }).then(response => {
    return response.json()
  })
}

const readAll = () => {
  return fetch('/.netlify/functions/exercises-read-all').then((response) => {
    return response.json()
  })
}

const update = (exerciseId, data) => {
  return fetch(`/.netlify/functions/exercises-update/${exerciseId}`, {
    body: JSON.stringify(data),
    method: 'POST'
  }).then(response => {
    return response.json()
  })
}

const deleteExercise = (exerciseId) => {
  return fetch(`/.netlify/functions/exercises-delete/${exerciseId}`, {
    method: 'POST',
  }).then(response => {
    return response.json()
  })
}

const batchDeleteExercise = (exerciseIds) => {
  return fetch(`/.netlify/functions/exercises-delete-batch`, {
    body: JSON.stringify({
      ids: exerciseIds
    }),
    method: 'POST'
  }).then(response => {
    return response.json()
  })
}

export default {
  create: create,
  readAll: readAll,
  update: update,
  delete: deleteExercise,
  batchDelete: batchDeleteExercise
}
