const handlerOfIndexComponentDatabaseManage = {
    componentDefinition: {
        template: '<div>' +
        '<Row>' +
        '<i-col span="12"><h2>Database List</h2></i-col>' +
        '<i-col span="12"><i-button icon="android-add" class="right" v-on:click="add_database">Add Database</i-button></i-col>' +
        '</Row>' +
        '<Row>' +
        '<i-col span="24">' +
        '<Alert type="error" show-icon v-if="has_error">' +
        'ERROR' +
        '<span slot="desc">{{ error_message }}</span>' +
        '</Alert>' +
        '</i-col>' +
        '</Row>' +
        '<i-table :columns="database_fields" :data="databases"></i-table>' +
        '<Modal v-model="show_edit_database" title="Update Database" @on-ok="modal_edit_database" @on-cancel="modal_close" :loading="modal_loading">' +
        '<i-input style="margin: 5px" v-model="edit_database_name"><span slot="prepend">Database Name</span></i-input>' +
        '<i-input style="margin: 5px" v-model="edit_server_type"><span slot="prepend">Type</span></i-input>' +
        '<i-input style="margin: 5px" v-model="edit_host"><span slot="prepend">Host</span></i-input>' +
        '<i-input style="margin: 5px" v-model="edit_port"><span slot="prepend">Port</span></i-input>' +
        '<div>' +
        '<Button type="text">Accounts: </Button>' +
        '</div>' +
        '<div v-for="account in edit_accounts">' +
        '<i-input style="margin: 5px" v-model="account.username"><span slot="prepend">Username</span></i-input>' +
        '<i-input style="margin: 5px" v-model="account.password"><span slot="prepend">Password</span></i-input>' +
        '<Button type="dash" class="right" v-on:click="delete_one_account_item(account.item_id)">Delete</Button>' +
        '<div class="clear"></div>' +
        '</div>' +
        '<div style="text-align: center">' +
        '<Button shape="circle" icon="android-add" v-on:click="add_one_account_item"></Button>' +
        '</div>' +
        '</Modal>' +
        '</div>',
        data: function () {
            return {
                modal_loading: true,
                show_edit_database: false,
                has_error: false,
                error_message: '',
                database_fields: [
                    {key: 'database_name', title: 'Database Name'},
                    {key: 'server_type', title: 'Server Type'},
                    {key: 'connection', title: 'Connection'},
                    {
                        key: 'action', title: 'Action',
                        render: (h, params) => {
                            return h('div', [
                                h('Button', {
                                    props: {
                                        type: 'primary',
                                        size: 'small'
                                    },
                                    style: {
                                        margin: '5px'
                                    },
                                    on: {
                                        click: () => {
                                            //this.show(params.index)
                                            console.log("click edit", params);
                                            this.edit_database(params.row.database_name);
                                        }
                                    }
                                }, 'Edit'),
                                h('Button', {
                                    props: {
                                        type: 'info',
                                        size: 'small'
                                    },
                                    style: {
                                        margin: '5px'
                                    },
                                    on: {
                                        click: () => {
                                            //this.remove(params.index)
                                            console.log("click ping", params);
                                            this.ping_database(params.row.database_name);
                                        }
                                    }
                                }, 'Ping'),
                                h('Button', {
                                    props: {
                                        type: 'error',
                                        size: 'small'
                                    },
                                    on: {
                                        click: () => {
                                            //this.remove(params.index)
                                            console.log("click remove", params);
                                            this.remove_database(params.row.database_name);
                                        }
                                    }
                                }, 'Delete')
                            ]);
                        }
                    }
                ],
                databases: [],
                //
                edit_database_name: '',
                edit_server_type: 'mysql',
                edit_host: '',
                edit_port: 3306,
                edit_accounts: []
            }
        },
        methods: {
            refresh_database_list: function () {
                vueIndex.$Loading.start();

                $.ajax({
                    url: '../api/DatabaseManageController/databases',
                    method: 'get',
                    dataType: 'json'
                }).done((response) => {
                    console.log(response);

                    let databases = [];

                    if (response.code !== 'OK') {
                        // vueIndex.$Notice.error({
                        //     title: 'Load Failed',
                        //     desc: response.data
                        // });

                        this.has_error = true;
                        this.error_message = response.data;
                    } else {
                        for (let i = 0; i < response.data.list.length; i++) {
                            let database_item = response.data.list[i];
                            databases.push({
                                database_name: database_item.database_name,
                                server_type: database_item.server_type,
                                connection: database_item.host + ":" + database_item.port,
                                host: database_item.host,
                                port: database_item.port,
                                accounts: database_item.accounts
                            });
                        }
                        this.databases = databases;
                    }
                    vueIndex.$Loading.finish();
                }).fail(() => {
                    vueIndex.$Loading.error();
                    this.has_error = true;
                    this.error_message = "Ajax Failed";
                }).always(() => {
                    //console.log("guhehe");
                });
            },
            add_database: function () {
                this.edit_database_name = '';
                this.edit_server_type = '';
                this.edit_host = '';
                this.edit_port = '';
                this.edit_accounts = [];
                this.show_edit_database = true;
            },
            edit_database: function (database_name) {
                let target_database = null;
                for (let i = 0; i < this.databases.length; i++) {
                    if (this.databases[i].database_name === database_name) {
                        target_database = this.databases[i];
                        break;
                    }
                }
                if (target_database) {
                    this.edit_database_name = target_database.database_name;
                    this.edit_server_type = target_database.server_type;
                    this.edit_host = target_database.host;
                    this.edit_port = target_database.port;
                    this.edit_accounts = [];
                    let item_id = 0;
                    for (let u in target_database.accounts) {
                        if (!target_database.accounts.hasOwnProperty(u)) continue;
                        let p = target_database.accounts[u];
                        this.edit_accounts.push({
                            username: u,
                            password: p,
                            item_id: item_id++
                        });
                    }
                }
                this.show_edit_database = true;
            },
            remove_database: function (database_name) {
                vueIndex.$Loading.start();
                $.ajax({
                    url: '../api/DatabaseManageController/removeDatabase',
                    method: 'post',
                    data: {
                        database_name: database_name
                    },
                    dataType: 'json'
                }).done((response) => {
                    if (response.code !== 'OK') {
                        this.has_error = true;
                        this.error_message = response.data;
                    } else {
                        this.refresh_database_list();
                    }
                    vueIndex.$Loading.finish();
                }).fail(() => {
                    vueIndex.$Loading.error();
                    this.has_error = true;
                    this.error_message = "Ajax Failed";
                }).always(() => {
                    //console.log("guhehe");
                });
            },
            modal_edit_database: function () {

                let edit_accounts = {};
                for (let i = 0; i < this.edit_accounts.length; i++) {
                    edit_accounts[this.edit_accounts[i].username] = this.edit_accounts[i].password;
                }

                vueIndex.$Loading.start();
                this.modal_loading = true;
                $.ajax({
                    url: '../api/DatabaseManageController/updateDatabase',
                    method: 'post',
                    data: {
                        database_name: this.edit_database_name,
                        server_type: this.edit_server_type,
                        host: this.edit_host,
                        port: this.edit_port,
                        accounts: edit_accounts
                    },
                    dataType: 'json'
                }).done((response) => {
                    console.log(response);

                    if (response.code !== 'OK') {
                        this.has_error = true;
                        this.error_message = response.data;
                        this.modal_loading = false;
                    } else {
                        this.refresh_database_list();
                        this.show_edit_database = false;
                    }
                    vueIndex.$Loading.finish();
                }).fail(() => {
                    vueIndex.$Loading.error();
                    this.has_error = true;
                    this.error_message = "Ajax Failed";
                    this.modal_loading = false;
                }).always(() => {
                    //console.log("guhehe");
                });
            },
            modal_close: function () {
                this.show_edit_database = false;
            },
            add_one_account_item: function () {
                this.edit_accounts.push({
                    username: '', password: '', item_id: this.edit_accounts.length
                })
            },
            delete_one_account_item: function (item_id) {
                console.log('delete_one_account_item', item_id);
                for (let k = 0; k < this.edit_accounts.length; k++) {
                    //if(!this.edit_accounts.hasOwnProperty(k))continue;
                    if (this.edit_accounts[k].item_id === item_id) {
                        this.edit_accounts.splice(k, 1);
                    }
                }
                for (let k = 0; k < this.edit_accounts.length; k++) {
                    this.edit_accounts[k].item_id = k;
                }

            },
            ping_database: function (database_name) {
                vueIndex.$Loading.start();
                $.ajax({
                    url: '../api/DatabaseWorkController/ping',
                    method: 'get',
                    data: {
                        database_name: database_name
                    },
                    dataType: 'json'
                }).done((response) => {
                    console.log(response);
                    if (response.code === 'OK') {
                        vueIndex.$Notice.success({
                            title: 'Database ' + database_name + " answered:",
                            desc: response.data.result
                        });
                        vueIndex.$Loading.finish();
                        //this.refreshServerList();
                    } else {
                        //this.has_error = true;
                        //this.error_message = response.data;
                        vueIndex.$Notice.error({
                            title: 'Ping Database ' + database_name,
                            desc: response.data
                        });
                        vueIndex.$Loading.error();
                    }
                }).fail(() => {
                    vueIndex.$Loading.error();
                    //this.has_error=true;
                    //this.error_message="Ajax Failed";
                    vueIndex.$Notice.error({
                        title: 'Ping Server ' + server_name,
                        desc: 'Ping Ajax Failed'
                    });
                }).always(() => {
                    //console.log("guhehe");
                });
            }
        },
        mounted: function () {
            this.refresh_database_list();
        }
    }
}