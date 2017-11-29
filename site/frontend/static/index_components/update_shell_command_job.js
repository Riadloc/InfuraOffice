const handlerOfIndexComponentUpdateShellCommandJob = {
    componentDefinition: {
        template: '<div>\
            <Row>\
                <i-col span="24"><h2>Update Shell Job</h2></i-col>\
            </Row>\
            <Row>\
                <i-col span="16">\
                    <span>Select to update: </span> \
                    <Select style="width: 200px" v-model="edit_job_name">\
                        <Option v-for="item in job_list" :value="item.job_name" :key="item.job_name">{{ item.job_name }}</Option>\
                    </Select> \
                    <Button v-on:click="on_load_btn">Load</Button>\
                </i-col>\
                <i-col span="8">\
                    <span>Or create one new:</span> \
                    <Button v-on:click="on_create_btn">New</Button>\
                </i-col> \
            </Row>\
            <Row><i-col span="24"><div style="margin-top: 20px">&nbsp;</div></i-col> </Row>\
            <Row><h3>{{ !is_draft_for_creation?"Update "+draft.job_name:"New Shell Job" }}</h3></Row>\
            <Row type="flex" justify="center" align="middle">\
                <i-col span="3"><span>Job Name: </span></i-col>\
                <i-col span="20">\
                    <i-input style="margin: 5px" v-model="draft.job_name" :readonly="!is_draft_for_creation"></i-input>\
                </i-col>\
            </Row>\
            <Row type="flex" justify="center" align="middle">\
                <i-col span="3"><span>Servers: </span></i-col>\
                <i-col span="20">\
                    <infura_server_select v-bind:value="draft.server_list" v-on:change="infura_server_select_changed"></infura_server_select>\
                </i-col>\
            </Row>\
            <Row type="flex" justify="space-between" align="middle">\
                <i-col span="3"><span>Cron Timer: </span></i-col>\
                <i-col span="4"><i-input style="margin: 5px" v-model="draft.cron_time_minute"><span slot="prepend">Minute</span></i-input></i-col>\
                <i-col span="4"><i-input style="margin: 5px" v-model="draft.cron_time_hour"><span slot="prepend">Hour</span></i-input></i-col>\
                <i-col span="4"><i-input style="margin: 5px" v-model="draft.cron_time_day_of_month"><span slot="prepend">Day</span></i-input></i-col>\
                <i-col span="4"><i-input style="margin: 5px" v-model="draft.cron_time_month"><span slot="prepend">Month</span></i-input></i-col>\
                <i-col span="4"><i-input style="margin: 5px" v-model="draft.cron_time_day_of_week"><span slot="prepend">Weekday</span></i-input></i-col>\
            </Row>\
            <Row type="flex" justify="center" align="middle">\
                <i-col span="3"><span>Shell Command: </span></i-col>\
                <i-col span="20">\
                    <i-input style="margin: 5px" v-model="draft.command_content"  type="textarea" :autosize="{minRows: 5}"></i-input>\
                </i-col>\
            </Row>\
            <Row type="flex" align="middle">\
                <i-col span="24">&nbsp;</i-col>\
            </Row>\
            <Row type="flex" align="middle">\
                <i-col span="24">\
                    <Button class="right" v-on:click="on_save_btn">SAVE</Button>\
                </i-col> \
            </Row>\
        </div>',
        data: function () {
            return {
                edit_job_name: '',
                job_list: [],
                is_draft_for_creation: true,
                draft: {
                    job_name: '',
                    job_type: 'ShellCommandJob',
                    cron_time_minute: '*',
                    cron_time_hour: '*',
                    cron_time_day_of_month: '*',
                    cron_time_month: '*',
                    cron_time_day_of_week: '*',
                    last_run_timestamp: 0,
                    command_content: '',
                    server_list: [],
                }
            }
        },
        methods: {
            load_existed_shell_jobs: function () {
                vueIndex.$Loading.start();
                $.ajax({
                    url: '../api/JobConfigController/jobs/ShellCommandJob',
                    method: 'post',
                    dataType: 'json'
                }).done((response) => {
                    if (response.code === 'OK') {
                        vueIndex.$Loading.finish();
                        //this.refresh_platform_accounts();

                        this.job_list = response.data.list;
                    } else {
                        this.$Message.error("Loading jobs: " + response.data);
                        vueIndex.$Loading.error();
                    }
                }).fail(() => {
                    this.$Message.error("Loading jobs: " + 'ajax failed');
                    vueIndex.$Loading.error();
                });
            },
            on_load_btn: function () {
                console.log("on_load_btn");
                if (!this.edit_job_name) return;
                this.is_draft_for_creation = false;
                for (let i = 0; i < this.job_list.length; i++) {
                    if (this.job_list[i].job_name === this.edit_job_name) {
                        this.draft = this.job_list[i];
                        console.log("....", i);
                        break;
                    }
                }
                console.log(this.draft);
            },
            on_create_btn: function () {
                console.log('on_create_btn');
                this.is_draft_for_creation = true;
                this.draft = {
                    job_name: '',
                    job_type: 'ShellCommandJob',
                    cron_time_minute: '*',
                    cron_time_hour: '*',
                    cron_time_day_of_month: '*',
                    cron_time_month: '*',
                    cron_time_day_of_week: '*',
                    last_run_timestamp: 0,
                    command_content: '',
                    server_list: [],
                };
            },
            on_save_btn: function () {
                console.log('on_save_btn');
                vueIndex.$Loading.start();
                $.ajax({
                    url: '../api/JobConfigController/updateJob',
                    method: 'post',
                    data: this.draft,
                    dataType: 'json'
                }).done((response) => {
                    if (response.code === 'OK') {
                        vueIndex.$Loading.finish();
                        this.$Message.success("Job updated");
                        this.load_existed_shell_jobs();
                    } else {
                        this.$Message.error("Update job: " + response.data);
                    }
                }).fail(() => {
                    this.$Message.error("Update job: " + 'ajax failed');
                    vueIndex.$Loading.error();
                });
            },
            infura_server_select_changed: function (x) {
                console.log('infura_server_select_changed', arguments);
                this.draft.server_list = x;
            }
        },
        mounted: function () {
            this.load_existed_shell_jobs();
        }
    }
}