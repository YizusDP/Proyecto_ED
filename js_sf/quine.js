let tablaDeVerdad;
let stateIsResultado = false;
const LETRAS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"; //Letras para la cantidad de variables

$(document).ready(init());

//Se inicializa y se genera la tabla interactiva
async function init(){
    tablaDeVerdad = new tablaDeVerdadView($("#entradas-input").attr("value"),"#input-tabla-verdad"); //Se crea la tabla de verdad

    $("#entradas-input").change(e => {
        $("#entradas-input").removeClass("is-success is-danger"); //Se remueven los estados de los botones(azul:sin seleccionar, verde: seleccionado, rojo: seleccione una opcion antes de continuar)
        if($("#entradas-input").val() >= $("#entradas-input").attr("min")
                && $("#entradas-input").val() <= $("#entradas-input").attr("max")){ //Se verifica que el numero de variables sea valido

            $($("#entradas-input").parent()).addClass("is-loading");
            tablaDeVerdad.setNumBits($("#entradas-input").val());
            $("#entradas-input").addClass("is-success");

        }else{
            $("#entradas-input").addClass("is-danger"); //La cantidad de variables no es valido
        }
    });

    await tablaDeVerdad.createView(); //Se crea la tabla y se muestra en pantalla
}

$(".simplificar-btn").click(async function(e) { //Boton de simplificar
    await asyncInitSimplificacion();
});

//Se muestra el desarrollo
async function asyncInitSimplificacion(){// Se hace de manera asincrona
    if(tablaDeVerdad.validate()){ //Se evalua si todos los elementos de la tabla de verdad tienen valor
        if(!stateIsResultado){ //Se evalua si el usuario esta viendo el resultado o no. En este caso NO lo esta viendo
            stateIsResultado = true;
            await simplificarFuncion(tablaDeVerdad.elements); // Se llama a la funcion que simplifica la funcion
        }else{ //El usuario SI esta viendo el resultado
            $(".simplificar-btn").text("Simplificar");
            stateIsResultado = false;
        }
    }
}

function bitsToExpresion(bitArray){ //Funcion que convierte un arreglo de Bits a una cadena con formato LATEX
    let exp = "";
    let hasNeg = false; //Variable que almacena si se encontro un bit 0

    for(let i = 0 ; i < bitArray.length ; ++i){ //Por cada bit en el arreglo
        if(bitArray[i] == OPTION_0 && !hasNeg){ //Si el bit es 0 y ademas no tiene otro Bit en 0 anteriormente entonces concatena la linea superior (negacion) de la entrada
            exp += "\\overline{"; //Inicializacion de la linea superior en formato LATEX
            hasNeg = true; //Se tiene un 0
        }else if(bitArray[i] == OPTION_1 && hasNeg){ //Si el bit es 1 y ademas el bit anterior es 0
            exp += "}"; //Se cierra la negacion de las otras entradas
            hasNeg = false; //No se tiene 0
        }
        if(bitArray != OPTION_INVALIDO){ //Si el bit existe
            exp += LETRAS[i]; //Concatena la entrada en letra (como A para representar la entrada 1)
        }
    }

    if(hasNeg){ //Si el ultimo bit es 0 se cierra la negacion en LATEX
        exp += "}";
    }
    return exp; //regresa la cadena en formato LATEX. Ejemplo A'BCD' la retorna \overline{A}BC\overline{D}
}

//Obtiene los minterminos ingresados por el usuario en la tabla de verdad
function getMinterminos(){ 
    let minter = [];
    for(let i = 0 ; i < tablaDeVerdad.elements.length; ++i){//Por cada elemento en la tabla de verdad
        if(tablaDeVerdad.elements[i].option == OPTION_1){ //Si el resultado del elemento es un bit 1
            minter.push(tablaDeVerdad.elements[i]); //Se añade el elemento a los minterminos
        }
    }
    
    let exp = "";
    for(let i = 0 ; i < minter.length ; ++i){
        exp += bitsToExpresion(minter[i].binaryArray)+(i < minter.length-1?" + ":""); //Se genera una cadena para mostrar en pantalla con los minterminos en formato LATEX
    }

    exp = "}="+exp;
    for(let i = tablaDeVerdad.numBits-1 ; i >= 0  ; --i){   //Esta parte añade el nombre a la funcion canonica a la cadena
        exp = LETRAS[i]+exp;                                //Ejemplo para 4 bits seria f(ABCD) =
    }                                                       //Ejemplo para 6 bits seria f(ABCDEF) =
    exp = "f_{"+exp;

    $("#mintermin-latex").text("$"+exp+"$"); //Imprime la expresion
    return minter; //Debuelve los terminos en su expresion canonica como suma de productos
}

function removeEmptyRows(arr){
    for (let i = 0; i < arr.length; i++) {
        if(arr[i].arr.length == 0){
            arr.splice(i,1);
        }
    }
    return arr;
}

function combinarMinterminos(mintClass){
    let arrCombinaciones = removeEmptyRows(mintClass.minterminosAgrup);
    let hasChanges = false;
    let newCombinada = [];
    let finalCombinar = [];

    do{
        newCombinada = [];
        hasChanges = false;
        for (let i = 0; i < arrCombinaciones.length-1; i++) {
            let grupo = {
                index : arrCombinaciones[i].index.concat(arrCombinaciones[i+1].index).filter(onlyUnique),
                arr : [],
            };
            for (let e = 0; e < arrCombinaciones[i].arr.length; e++) {
                const elG1 = new minterminoStruct(arrCombinaciones[i].arr[e].arr);
                let seCombino = false;
                for (let j = 0; j < arrCombinaciones[i+1].arr.length; j++) {
                    const elG2 = new minterminoStruct(arrCombinaciones[i+1].arr[j].arr);
                    if(elG1.sonCombinables(elG2)){
                        hasChanges = true;
                        grupo.arr.push({
                            arr: elG1.AND(elG2),
                            mintId: arrCombinaciones[i].arr[e].mintId.concat(arrCombinaciones[i+1].arr[j].mintId).filter(onlyUnique)
                        });
                        seCombino = true;
                    }else if(j == arrCombinaciones[i+1].arr.length-1 && !puedeSimplificarce(arrCombinaciones[i-1], elG1) && !seCombino){
                        finalCombinar.push({
                            index: arrCombinaciones[i].index.concat(arrCombinaciones[i+1].index).filter(onlyUnique),
                            arr: arrCombinaciones[i].arr[e],
                        });
                    }
                }
            }
            newCombinada.push(grupo);
        }

        const lastIndex = Number(arrCombinaciones.length-1);

        console.log(arrCombinaciones, lastIndex);

        if(hasChanges){
            let newMint = new simplificacionTabla(newCombinada);
            newMint.createView("#mintermin-table");
            arrCombinaciones = newMint.minterminosAgrup;
        }
    }while(hasChanges);

    for (let i = 0; i < arrCombinaciones.length; i++) {
        for (let e = 0; e < arrCombinaciones[i].arr.length; e++) {
            finalCombinar.push({
                index: arrCombinaciones[i].index,
                arr: arrCombinaciones[i].arr[e],
            });
        }
    }

    return finalCombinar.filter(contains);
}

function contains(implicante, index, arr){
    for (let e = index+1; e < arr.length; e++) {
        let res = 0;
        for (let i = 0; i < arr[e].arr.arr.length; i++) {
            if(implicante.arr.arr[i] == arr[e].arr.arr[i]){
                res++;
            }
        }
        if(res == implicante.arr.arr.length){
            return false;
        }
    }

    return true;
}

function puedeSimplificarce(arrAnterior, val){
    let ret = false;
    if(arrAnterior != undefined){
        for (let i = 0; i < arrAnterior.arr.length; i++) {
            const elG2 = new minterminoStruct(arrAnterior.arr[i].arr);
            if(elG2.sonCombinables(val)){
                ret = true;
            }
        }
    }

    return ret;
}

function countDiferencias(arr, arr2){
    let cont = 0;
    let index = -1;
    for (let i = 0; i < arr.length; i++) {
        if(arr[i] != arr2[i] && arr[i] != 2 && arr2[i] != 2){
            cont++;
            index = i;
        }
    }
    return [cont, index];
}

function simplificarFuncion(els){ //Funcion que miniza la expresion
    $($("#entradas-input").parent()).addClass("is-loading");
    $("#mintermin-table").html("");
    $(".simplificar-btn").attr("disabled","");
    let mint = getMinterminos(); //Se obtienen los minterminos

    console.log(mint);
    
    let mintClass = new tablaMinterminos(mint); //Se crea un objeto que agrupa los minterminos por la cantidad de Bits 1 que contienen
   
    mintClass.createView("#mintermin-table"); //Se crea la tabla de la agrupacion anterior para mostrarlo en el desarrollo en la intergaz de usuario
    
    let res = combinarMinterminos(mintClass);
    
    let implicantePrimo = new tablaImplicantes(res);
    implicantePrimo.createView("#mintermin-table", mint);
    
    $(".resultado-ly").text(implicantePrimo.getResultado());
    updateLatex(); //Se actualizan las cadenas en formato LATEX
    $(".simplificar-btn").removeAttr("disabled");
    $($("#entradas-input").parent()).removeClass("is-loading");
}

function updateLatex(){ //Funcion que actualiza todas las cadenas en LATEX
    let math = document.getElementById("MathExample");
    MathJax.Hub.Queue(["Typeset",MathJax.Hub,math]);
}

function intToBinario(num, numBits){ //Funcion que convierte un entero a un arreglo de Bits con determinado tamaño de bits
    let bin = [];

    while(num > 0 && numBits > 0){ //Mientras el numero sea mayor que 0 y aun haya bits disponibles
        bin.push(num%2); //Se agrega el bit al arreglo
        num = Math.floor(num/2); //Se rendondea la divicion hacia su entero correspondiente. Por ejemplo 1.75 a 1 y 3.99 a 3
        numBits --;
    }

    for(let i = 0 ; i < numBits ; ++i){ //Los bits que sobren se rellenan con 0
        bin.push(0);
    }

    return bin.reverse(); //Se invierten los bits para tenerlos en el formato correcto
}

function onlyUnique(value, index, self) { 
    return self.indexOf(value) === index;
} 