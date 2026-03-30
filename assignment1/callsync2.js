function syncfunc() {
    console.log("In syncfunc.  No async operations here.")
    return "Returned from syncfunc."
}

async function asyncCaller() {
    console.log("Not about to wait.")
    const res = syncfunc()
    console.log(res)
    return "asyncCaller complete."
}

console.log("Calling asyncCaller.")
const r = asyncCaller()
console.log(`Got back a value from asyncCaller of type ${typeof r}`)
if (typeof r == "object") {
    console.log(`That object is of class ${r.constructor.name}`)
}
r.then(resolvesTo => {
    console.log("The promise resolves to: ", resolvesTo)
})
console.log("Finished.")