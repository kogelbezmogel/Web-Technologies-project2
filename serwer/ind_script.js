/* Global variables for indexdDB */
var data_base = null;
var object_store = null;
var storeName = "Measurments";
var dbName = "TempDataBase";
var dbrequest = window.indexedDB.open(dbName, 6);
var data = [];

dbrequest.onerror = function(event) {
    //alert("ERROR!");
}
dbrequest.onsuccess = function(event) {
    //alert("SUCCES!");
    if(! data_base)
        data_base = event.target.result;
}
dbrequest.onupgradeneeded = function(event) {
    //alert("UPDATE!");
    data_base = event.target.result;

    if( ! data_base.objectStoreNames.contains(storeName) ) {
        object_store = data_base.createObjectStore(storeName, { autoIncrement : true } );
    }
}
/*      End section       */




/* Making requests sections */
var xmlHttp;
function getRequestObject() {
    if ( window.ActiveXObject) {
        return ( new ActiveXObject("Microsoft.XMLHTTP")) ;
    }
    else if (window.XMLHttpRequest) {
       return (new XMLHttpRequest())  ;
    }
    else {
       return (null) ;
    }
  }


function sendPostRequest( data, url )      {
    xmlHttp = getRequestObject() ;
    if (xmlHttp) {
      try {
        xmlHttp.onreadystatechange = handleResponse ;
        xmlHttp.open("POST", url, true);
        xmlHttp.setRequestHeader("Content-Type",'application/json; charset=utf-8') ;
        xmlHttp.send(data);
      }
      catch (e) {
        alert ("Nie mozna polaczyc sie z serwerem: " + e.toString()) ;
      }
    } else {
      alert ("Blad") ;
    }
}

function sendGetRequest( url, lambda ) {
    xmlHttp = getRequestObject();
    if (xmlHttp) {
      try {
        xmlHttp.onreadystatechange = lambda ;
        xmlHttp.open("GET", url, true);
        xmlHttp.send(null);
      }
      catch (e) {
        alert ("Nie mozna polaczyc sie z serwerem: " + e.toString()) ;
      }
    } else {
      alert ("Blad") ;
    }
}


function handleResponse()      {
 if (xmlHttp.readyState == 4) {
      if ( xmlHttp.status == 200 )  {
          alert("Dostarczono");
          sendedLocalComplition();
      }
      else if ( xmlHttp.status != 200 ) {
        alert( xmlHttp.response );
    }
 }  
}
/* End section */





function saveMesu() {
    date = document.getElementById("date_in").value;
    time = document.getElementById("time_in").value;
    temp = document.getElementById("temp_in").value;
    
    time_regex = new RegExp("^[0-2][0-9]:[0-5][0-9]$");
    temp_regex = new RegExp("^[+-]?([0-9]+([.][0-9]*)?|[.][0-9]+)$");
    date_regex = /\d{4}\-(0?[1-9]|1[012])\-(0?[1-9]|[12][0-9]|3[01])$/;
    lgate_date = date.match(date_regex) != null;
    lgate_temp = temp_regex.test(temp);
    lgate_time = time_regex.test(time);

    if( lgate_date && lgate_temp && lgate_time) { 

        tuple = { date, time, temp };

        tx = data_base.transaction(storeName, 'readwrite');
        tx.oncomplete = (e) => { console.log(e); };
        tx.onerror = (e) => { console.warn(e); };

        let store = tx.objectStore(storeName);
        let request = store.add(tuple);
        request.onsuccess = (e) => { console.log("added a tuple"); alert("Dodano pomiar."); };
        request.onerror = (e) => { console.warn("something went wrong"); };
    }
    else {
        text = "Pdano złe warotści: \n";
        text += lgate_date ? "" : "- zła data \n";
        text += lgate_temp ? "" : "- zła temperatura \n";
        text += lgate_time ? "" : "- zły czas \n";
        alert(text);
    }
}


function addMesu() {
    document.getElementById('div_chart').innerHTML = "";
    document.getElementById('div_content').innerHTML = "";
    form = document.getElementById("div_form");
    html = "";
    html += "<form action=''> ";
    html += "   <label for=''> Data pomiaru: </label>";
    html += "   <input id='date_in' type='text' /> (YYYY-MM-DD) </br>";
    html += "   <label for=''> Godzina pomiaru: </label>";
    html += "   <input id='time_in' type='text' /> (hh:mm) </br>";
    html += "   <label for=''> Wartosc pomiaru </label>";
    html += "   <input id='temp_in' type='text' /> (&#8451;) </br>";
    html += "   <input type=button onclick='saveMesu()' value='Zapisz pomiar' />";
    html += "</form>";

    form.innerHTML = html;
}


function gatherData() {

    data = [];

    tx = data_base.transaction(storeName, 'readwrite');
    tx.onerror = (e) => { console.warn(e); };
    tx.onsuccess = (e) => { console.log(e); };

    let store_cursor = tx.objectStore(storeName).openCursor();
    store_cursor.onerror = (e) => { console.warn(e); };
    store_cursor.onsuccess = (e) => {
        var cursor = e.target.result;
        if( cursor ) {
            data.push(cursor.value);
            cursor.continue();
        }
        else {
            showNotSended();
            console.log("No more data found!");
        }
    };
}

function showNotSended() {
    document.getElementById('div_content').innerHTML = "";
    document.getElementById('div_chart').innerHTML = "";
    form = document.getElementById('div_form');
    
    html = "";
    if( data.length ) {

        headers = new Map();
        headers.set('date', 'Data');
        headers.set('time', 'Godzina');
        headers.set('temp', 'Temperatura');

        html += "<h1>";
        html += "   Pomiary do przesłania na serwer. ";
        html += "</h1>";
        html += createHtmlTable(headers, data); 
    }
    else {
        html += "<h1> Lokalna baza pomiarów jest pusta. </h1>";
    }
    form.innerHTML = html;
}


function iterateThrouhDataToSend() {

    data = [];

    tx = data_base.transaction(storeName, 'readwrite');
    tx.onerror = (e) => { console.warn(e); };
    tx.onsuccess = (e) => { console.log(e); };

    let store_cursor = tx.objectStore(storeName).openCursor();
    store_cursor.onerror = (e) => { console.warn(e); };
    store_cursor.onsuccess = (e) => {
        var cursor = e.target.result;
        if( cursor ) {
            data.push(cursor.value);
            cursor.continue();
        }
        else {
            url = "/sending";
            data = JSON.stringify( data );
            sendPostRequest(data, url);
            console.log("No more data found!");
        }
    };
}





function sendedLocalComplition() {
    tx = data_base.transaction(storeName, 'readwrite');
    store = tx.objectStore(storeName);
    if ( store ) { store.clear(); }

    form = document.getElementById("div_form");
    form.innerHTML = "<h1> Przesłano lokalne dane na serwer. </h1>";
    document.getElementById('div_chart').innerHTML = "";
    document.getElementById('div_content').innerHTML = "";
}


function getAllMesu() {
    sendGetRequest( '/All', function() {
        if (xmlHttp.readyState == 4) {
            if ( xmlHttp.status == 200 )  {
                var data = xmlHttp.response;
                document.getElementById('div_chart').innerHTML = "";
                document.getElementById('div_form').innerHTML = "";
                content = document.getElementById('div_content');
                data = JSON.parse(data);

                headers = new Map();
                headers.set( 'date', 'Data' );
                headers.set( 'time', 'Godzina' );
                headers.set( 'temp', 'Temperatura' );
                
                html = "<h1> Wszystkie pomiary na serwerze: </h1>"
                html += createHtmlTable(headers, data);
                content.innerHTML = html;
            }
            else if ( xmlHttp.status == 401 ) {
                alert( xmlHttp.response );
            }
       }  
    });
}


function avgDayByDay() {
    url = '/AvgTemp/';
    date1 = document.getElementById('date_from').value;
    date2 = document.getElementById('date_to').value;
    
    date_regex = /\d{4}\-(0?[1-9]|1[012])\-(0?[1-9]|[12][0-9]|3[01])$/;
    lgate_date1 = date1.match(date_regex) != null;
    lgate_date2 = date2.match(date_regex) != null;

    if(  lgate_date1 && lgate_date2 ) {
        url += date1 + '/' + date2;
        sendGetRequest( url, function() {
            if (xmlHttp.readyState == 4) {
                if ( xmlHttp.status == 200 )  {
                    var data = xmlHttp.response;
                    content = document.getElementById('div_content');
                    chart_div = document.getElementById('div_chart');
                    data = JSON.parse(data);

                    headers = new Map();
                    headers.set('date', 'Data');
                    headers.set('avg', 'Średnia temperatura');
                    headers.set('amount', 'Liczba pomiaroów');
                    
                    html = `<h1> Średnia temperatura od ${date1} do ${date2} </h1>`;
                    html += createHtmlTable(headers, data);

                    content.innerHTML = html;
                    args = [];
                    values = [];
                    for( i = 0; i < data.length; i++ ) {
                        args.push( data[i].date );
                        if( data[i].avg != 'Brak danych' ) values.push( data[i].avg );
                        else  values.push( null );
                    }
                    createHtmlChart(args, values, chart_div);
                }
                else if ( xmlHttp.status == 401 ) {
                    alert( xmlHttp.response );
                }
           }  
        });
    }
    else {
        alert("Podana data nie jest poprawna");
    }
}

function avgDayByDayForm() {
    document.getElementById('div_chart').innerHTML = "";
    document.getElementById('div_content').innerHTML = "";
    form = document.getElementById("div_form");
    html = "";
    html += "<form action=''> ";
    html += "   <label for='date_from'> Data od: </label>";
    html += "   <input id='date_from' type='text' /> (YYYY-MM-DD) </br>";
    html += "   <label for='date_to'> Data do: </label>";
    html += "   <input id='date_to' type='text' /> (YYYY-MM-DD) </br>";
    html += "   <input type=button onclick='avgDayByDay()' value='Wyświetl' />";
    html += "</form>";

    form.innerHTML = html;
}


function tempInDay() {
    url = '/TempInDay/';
    date1 = document.getElementById('date_from').value;
    date_regex = /\d{4}\-(0?[1-9]|1[012])\-(0?[1-9]|[12][0-9]|3[01])$/;
    lgate_date1 = date1.match(date_regex) != null;

    if( lgate_date1 ) {
        url += date1;
        sendGetRequest( url,  function() {
            if (xmlHttp.readyState == 4) {
                if ( xmlHttp.status == 200 )  {
                    var data = xmlHttp.response;
                    data = JSON.parse(data);
                    content = document.getElementById('div_content');
                    chart_div = document.getElementById('div_chart');

                    headers = new Map();
                    headers.set('time', 'Godzina');
                    headers.set('temp', 'Temperatura');
                    
                    html = `<h1> Temperatura w dniu ${date1} </h1>`;
                    html += createHtmlTable(headers, data);

                    content.innerHTML = html;

                    args = [];
                    values = [];
                    for( i = 0; i < data.length; i++ ) {
                        args.push( data[i].time );
                        values.push( data[i].temp );
                    }
                    createHtmlChart(args, values, chart_div);
                }
                else if ( xmlHttp.status == 401 ) {
                    alert( xmlHttp.response );
                }
           }  
        });
    }
    else {
        alert("Podana data jest niepoprawna");
    }
}



function tempInDayForm() {
    document.getElementById('div_chart').innerHTML = "";
    document.getElementById('div_content').innerHTML = "";
    form = document.getElementById("div_form");
    html = "";
    html += "<form action=''> ";
    html += "   <label for='date_from'> Dzień: </label>";
    html += "   <input id='date_from' type='text' /> (YYYY-MM-DD) </br>";
    html += "   <input type=button onclick='tempInDay()' value='Wyświetl' />";
    html += "</form>";

    form.innerHTML = html;
}


function createHtmlTable(headers, data) {
    
    html = "";
    html += "<p> <div id='div_dataTable'>";

    html += "   <table>";
    html += "       <tr>";
    for( let  [key, value] of headers ) {
        html += `       <th> ${ value } </th>`;
    }
    html += "       </tr>";

    for( i = 0; i < data.length; i++ ) {
        html += "   <tr>";
        for( let [key, value] of headers ) {
            html += `       <td> ${ data[i][ key ] } </td>`;
        }
        html += "   </tr>";
    }
    html += "   </table>";
    html += "</div> </p>";

    return html;
}


function createHtmlChart(args, values, chart_div) {
    width = chart_div.clientWidth;
    height = chart_div.clientHeight;

    for( i = 0; i < values.length; i++ ) { // uśrednienie wyników nieznanych wartości
        if( values[i] == null ) {
            left = 0;
            right = 0;
            left_i = i;
            right_i = i;
            while( left_i >=0 && values[left_i] == null ) {
                left_i--;
            }
            left = values[left_i] ? values[left_i] : 0;

            while( right_i < values.length && values[right_i] == null ) {
                right_i++;
            }
            right = values[right_i] ? values[right_i] : 0;

            values[i] = (parseFloat(right) + parseFloat(left) ) / 2;

        }
    }

    html = `<canvas id='myChart' width='${width}' height='${height}' > </canvas>`;
    chart_div.innerHTML = html;

    new Chart("myChart", {
        type: "line",
        data: {
            labels: args,
            datasets: [{
                backgroundColor: "rgba(0,0,0,1.0)",
                borderColor: "rgba(128,0,0,0.5)",
                cubicInterpolationMode: 'monotone',
                tension: 0.4,
                data: values
            }]
        },
        options:{
            plugins : {
                legend: {display: false},
                title: {
                    display: true,
                    text: "Zmiana temperatury w czasie"
                }
            }
        }
        });
}