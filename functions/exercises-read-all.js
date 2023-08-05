/* Import faunaDB sdk */
const faunadb = require('faunadb')
const q = faunadb.query


exports.handler = (event, context) => {
  console.log('Function `exercise-read-all` invoked')
  /* configure faunaDB Client with our secret */
  const client = new faunadb.Client({
    secret: process.env.FAUNADB_SERVER_SECRET
  }) 
  return client.query(q.Paginate(q.Match(q.Ref('indexes/all_exercises'))))
    .then((response) => {
      const exerciseRefs = response.data
      console.log('Exercise refs', exerciseRefs)
      console.log(`${exerciseRefs.length} exercises found`)
      // create new query out of exercise refs. http://bit.ly/2LG3MLg
      const getAllExerciseDataQuery = exerciseRefs.map((ref) => {
        return q.Get(ref)
      })
      // then query the refs
      return client.query(getAllExerciseDataQuery).then((ret) => {
        return {
          statusCode: 200,
          body: JSON.stringify(ret)
        }
      })
    }).catch((error) => {
      console.log('error', error)
      return {
        statusCode: 400,
        body: JSON.stringify(error)
      }
    })
}
