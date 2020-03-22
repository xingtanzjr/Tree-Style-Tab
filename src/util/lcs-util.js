class LCSUtil {
    LCS(origin, aim) {
        console.log("origin: " + origin);
        console.log("aim: " + aim);
        const originLength = origin.length;
        const aimLength = aim.length;
        let dp = new Array(originLength + 1);
        // step[i][j]: 1 means from step[i-1][j], 2 means from step[i][j-1], 3 means from step[i-1][j-1] 
        let step = new Array(originLength + 1);
        for (let i = 0 ; i < originLength + 1; i ++) {
            dp[i] = new Array(aimLength + 1);
            step[i] = new Array(aimLength + 1);
            dp[i][0] = 0;
            step[i][0] = 0;
        }
        for (let i = 0 ; i < aim.length + 1 ; i ++ ) {
            dp[0][i] = 0;
            step[0][1] = 0;
        }
        for(let i = 1; i < originLength + 1; i ++) {
            for (let j = 1; j < aimLength + 1; j ++ ) {
                let v1 = -1;
                let v2 = -1;
                let v3 = -1;
                //Ignore case
                if (origin[i - 1].toLowerCase() === aim[j - 1].toLowerCase()) {
                    v1 = dp[i - 1][j - 1] + 1;
                }
                v2 = dp[i][j - 1];
                v3 = dp[i - 1][j];
                if (v1 > v2 && v1 > v3) {
                    dp[i][j] = v1;
                    step[i][j] = 1;
                } else if (v2 > v3) {
                    dp[i][j] = v2;
                    step[i][j] = 2;
                } else {
                    dp[i][j] = v3;
                    step[i][j] = 3;
                }

            }
        }
        const ret = {
            length: dp[originLength][aimLength],
            step,
        };
        return ret;
    }

    getPath(step) {
        let ret = new Array(step.length - 1);
        let i = step.length - 1;
        let j = step[0].length - 1;
        for(let p = ret.length - 1; p >= 0 ; p -- ) {
            if (step[i][j] == 1) {
                i --;
                j --;
                ret[p] = 1;
            } else {
                i --;
                ret[p] = 0;
            }
        }
        return ret;
    }
}

const util = new LCSUtil();
export default util;